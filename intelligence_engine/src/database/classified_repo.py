"""
Repositorio de Leads Clasificados — LICE
Gestiona la persistencia de los leads procesados en una base de datos 
intermedia optimizada para consultas de API y analytics.
"""

import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime

# Ubicación de la base de datos absoluta respecto a este archivo
DB_PATH = (Path(__file__).parent.parent.parent / "data" / "leads_processed.db").resolve()

class ClassifiedRepo:
    @staticmethod
    def get_connection():
        """Retorna una conexión a la base de datos de leads procesados."""
        DB_PATH.parent.mkdir(exist_ok=True, parents=True)
        return sqlite3.connect(DB_PATH)

    @staticmethod
    def init_db():
        """Inicializa la estructura de la base de datos intermedia."""
        conn = ClassifiedRepo.get_connection()
        cursor = conn.cursor()
        
        print(f"🗄️  Inicializando base de datos intermedia: {DB_PATH}")
        
        # Tabla principal de leads procesados
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leads_processed (
                id TEXT PRIMARY KEY,
                name TEXT,
                email TEXT,
                website TEXT,
                rubro TEXT,
                sector TEXT,
                categoria TEXT,
                confidence REAL,
                nivel_clasificacion INTEGER,
                fuente TEXT,
                correo_institucional INTEGER,
                redes_detectadas TEXT,
                tiene_web_propia INTEGER,
                digital_score_lice INTEGER,
                priority_score INTEGER,
                priority_tag TEXT,
                whatsapp_number TEXT,
                updated_at TEXT
            )
        """)
        
        # Índices para búsquedas rápidas en API
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sector ON leads_processed(sector)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_categoria ON leads_processed(categoria)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_score ON leads_processed(digital_score_lice)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_priority ON leads_processed(priority_score)")
        
        conn.commit()
        conn.close()

    @staticmethod
    def upsert_leads(df: pd.DataFrame):
        """
        Inserta o actualiza leads masivamente.
        """
        if df.empty:
            return

        conn = ClassifiedRepo.get_connection()
        now = datetime.now().isoformat()
        
        # Preparar DataFrame para SQLite
        upload_df = df.copy()
        upload_df["updated_at"] = now
        
        # Asegurar booleanos como int
        bool_cols = ["correo_institucional", "tiene_web_propia"]
        for col in bool_cols:
            if col in upload_df.columns:
                upload_df[col] = upload_df[col].fillna(0).astype(int)

        # ── FILTRAR COLUMNAS ──
        # Solo quedarnos con las que la tabla leads_processed espera
        db_cols = [
            "id", "name", "email", "website", "rubro", "sector", "categoria", 
            "confidence", "nivel_clasificacion", "fuente", "correo_institucional", 
            "redes_detectadas", "tiene_web_propia", "digital_score_lice", 
            "priority_score", "priority_tag", "whatsapp_number", "updated_at"
        ]
        # Quedarse solo con las que existen en el DF
        final_cols = [c for c in db_cols if c in upload_df.columns]
        upload_df = upload_df[final_cols]

        cursor = conn.cursor()
        
        # ── PROCESAMIENTO POR LOTES (BATCHES) ──
        # Evita el error "too many SQL variables" procesando de a 500 leads
        chunk_size = 500
        for i in range(0, len(upload_df), chunk_size):
            chunk = upload_df.iloc[i:i + chunk_size]
            place_ids = chunk["id"].tolist()
            
            # 1. Borrar si existen
            cursor.execute(
                f"DELETE FROM leads_processed WHERE id IN ({','.join(['?']*len(place_ids))})", 
                place_ids
            )
            
            # 2. Insertar lote
            chunk.to_sql("leads_processed", conn, if_exists="append", index=False)
        
        conn.commit()
        conn.close()
        print(f"   ✅ DB: {len(df)} leads sincronizados exitosamente.")

    @staticmethod
    def get_summary_stats():
        """Retorna estadísticas agregadas para el dashboard."""
        conn = ClassifiedRepo.get_connection()
        stats = {}
        
        # Totales por sector
        stats["by_sector"] = pd.read_sql(
            "SELECT sector, COUNT(*) as count FROM leads_processed GROUP BY sector", conn
        ).to_dict(orient="records")
        
        # Promedio de score por categoría (Top 10)
        stats["top_categories_score"] = pd.read_sql("""
            SELECT categoria, AVG(digital_score_lice) as avg_score, COUNT(*) as count 
            FROM leads_processed 
            WHERE categoria IS NOT NULL 
            GROUP BY categoria 
            ORDER BY avg_score DESC 
            LIMIT 10
        """, conn).to_dict(orient="records")
        
        conn.close()
        return stats

    @staticmethod
    def search_leads(sector=None, categoria=None, min_score=None, 
                    has_email=None, has_socials=None, has_whatsapp=None,
                    has_website=None, limit=100, offset=0):
        """Búsqueda avanzada de leads filtrados."""
        conn = ClassifiedRepo.get_connection()
        query = "SELECT * FROM leads_processed WHERE 1=1"
        params = []
        
        if sector:
            query += " AND sector = ?"
            params.append(sector)
        if categoria:
            query += " AND categoria = ?"
            params.append(categoria)
        if min_score:
            query += " AND digital_score_lice >= ?"
            params.append(min_score)

        if has_email:
            if has_email == "corp":
                query += " AND correo_institucional = 1"
            elif has_email == "gen":
                query += " AND email IS NOT NULL AND email != '' AND correo_institucional = 0"
            elif has_email == "any":
                query += " AND email IS NOT NULL AND email != ''"
            elif has_email == "none":
                query += " AND (email IS NULL OR email = '')"
        
        if has_socials is not None:
            if has_socials:
                query += " AND redes_detectadas IS NOT NULL AND redes_detectadas != ''"
            else:
                query += " AND (redes_detectadas IS NULL OR redes_detectadas = '')"

        if has_whatsapp is not None:
            if has_whatsapp:
                query += " AND redes_detectadas LIKE '%whatsapp%'"
            else:
                query += " AND redes_detectadas NOT LIKE '%whatsapp%'"

        if has_website is not None:
            if has_website:
                query += " AND tiene_web_propia = 1"
            else:
                query += " AND tiene_web_propia = 0"
            
        query += f" ORDER BY digital_score_lice DESC LIMIT {limit} OFFSET {offset}"
        
        df = pd.read_sql(query, conn, params=params)
        conn.close()
        return df

    @staticmethod
    def get_lead_by_id(lead_id: str):
        """Retorna todos los datos de un lead específico por su ID."""
        conn = ClassifiedRepo.get_connection()
        query = "SELECT * FROM leads_processed WHERE id = ?"
        df = pd.read_sql(query, conn, params=[lead_id])
        conn.close()
        
        if df.empty:
            return None
        return df.iloc[0].to_dict()
