"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SearchInput } from "./search-input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchableFields?: (keyof T)[];
  sortable?: boolean;
  actions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  rowClassName?: (row: T) => string;
  paginated?: boolean;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = "Buscar...",
  searchableFields = [],
  sortable = true,
  actions,
  onRowClick,
  emptyState,
  rowClassName,
  paginated = true,
  pageSize = 50,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search || searchableFields.length === 0) return data;

    const searchLower = search.toLowerCase();
    return data.filter((row) =>
      searchableFields.some((field) => {
        const value = row[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      }),
    );
  }, [data, search, searchableFields]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortField || !sortable) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [filteredData, sortField, sortDir, sortable]);

  // Paginate data
  const pageCount = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, paginated]);

  const toggleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {searchable && (
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-sm">
          <SearchInput
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={`h-10 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] ${
                    column.sortable && sortable
                      ? "cursor-pointer hover:bg-[#F3F4F6]"
                      : ""
                  } ${column.className || ""}`}
                  style={{ width: column.width }}
                  onClick={() =>
                    column.sortable &&
                    sortable &&
                    toggleSort(column.key as keyof T)
                  }
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable &&
                      sortable &&
                      sortField === column.key &&
                      (sortDir === "asc" ? (
                        <ChevronUp size={14} className="text-[#6B7280]" />
                      ) : (
                        <ChevronDown size={14} className="text-[#6B7280]" />
                      ))}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="h-10 px-4 w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-8"
                >
                  {emptyState || (
                    <p className="text-sm text-[#9CA3AF]">
                      No hay datos para mostrar
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, idx) => (
                <TableRow
                  key={idx}
                  className={`border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  } ${rowClassName?.(row) || ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={String(column.key)}
                      className={`px-4 py-3 text-sm text-[#111111] ${column.className || ""}`}
                      style={{ width: column.width }}
                    >
                      {column.render
                        ? column.render(row[column.key as keyof T], row)
                        : String(row[column.key as keyof T] ?? "—")}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="px-4 py-3 text-right w-12">
                      <div onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">
            Página {currentPage} de {pageCount}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm font-semibold text-[#111111] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F9FAFB] transition-colors"
            >
              Anterior
            </button>
            <button
              disabled={currentPage === pageCount}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm font-semibold text-[#111111] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F9FAFB] transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
