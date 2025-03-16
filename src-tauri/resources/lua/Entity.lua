local Entity = {
    draggable = false,
    scripts = {},
    scripts_available = {},
    scripts_str = ""
}

function Entity:new(o)
    o = o or {}
    setmetatable(o, self)
    self.__index = self
    return o
end

function Entity:update(data)
    for k, v in pairs(data) do self[k] = v end
end

return Entity
