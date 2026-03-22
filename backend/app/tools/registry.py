class Tool:
    def __init__(self, name, input_schema, func):
        self.name = name
        self.input_schema = input_schema
        self.func = func

    async def run(self, input_data, tenant_id):
        return await self.func(input_data, tenant_id)

REGISTRY = {}

def register(name, tool):
    REGISTRY[name] = tool

def get(name):
    return REGISTRY.get(name)
