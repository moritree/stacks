local serializer = require('serpent')

local Entity = {
    draggable = false,
    scripts = {},
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

function Entity:load_script(funcname, as_string)
    local success, loaded = serializer.load(("local func = function(self) " ..
        (as_string or self.scripts[funcname].string) .. " ; end ; return func"), { safe = false })
    if not success then
        print(string.format("Warning: Couldn't load script as function: %s", loaded --[[@as string]]))
        return false
    end
    self.scripts[funcname].func = (loaded --[[@as function]])
    return true
end

function Entity:run_script(funcname)
    -- TODO pass errors up?
    if not self.scripts[funcname] then
        print(string.format("Warning: %s is not a valid function on this entity", funcname))
    end

    if (not self.scripts[funcname].func) or (type(self.scripts[funcname]) ~= "function") then
        if self:load_script(funcname) == false then return end
    end
    self.scripts[funcname].func(self)
end

return Entity
