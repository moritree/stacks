local serializer = require('serpent')
local deep_copy = require('deep_copy')

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
    as_string = "local func = function(self, params) " ..
        (as_string or self.scripts[funcname].string) .. " ; end ; return func"
    local success, loaded = serializer.load(as_string, { safe = false })
    if not success then error("Serializer couldn't load script as function.") end
    self.scripts[funcname].func = (loaded --[[@as function]])
end

function Entity:run_script(funcname, params)
    if not self.scripts[funcname] then
        error(string.format("Warning: %s is not a valid function on this entity.", funcname))
    end

    if type(self.scripts[funcname].func) ~= "function" and self:load_script(funcname) == false then
        error("Couldn't load script.")
    end

    self.scripts[funcname].func(self, params)
end

function Entity:serializable()
    local copy = deep_copy(self)
    copy.scene = nil
    if copy.scripts then for _, script in pairs(copy.scripts) do script.func = nil end end
    return copy
end

return Entity
