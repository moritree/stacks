local Entity = {
    draggable = false,
    scripts = {}
}

function Entity:new(o)
    o = o or {}
    setmetatable(o, self)
    self.__index = self
    return o
end

return Entity
