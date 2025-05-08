local serializer = require('serpent')
local deep_copy = require('deep_copy')

local Entity = {
    draggable = false,
    scripts = {},
}

function Entity:new(o)
    local entity = {}
    setmetatable(entity, self)
    self.__index = self
    entity:update(o or {})
    return entity
end

function Entity:update(data)
    if (data.layer and ((not type(data.layer) == "number") or data.layer < 0)) then data.layer = 0 end

    for k, v in pairs(data) do self[k] = v end
end

function Entity:load_script(funcname, script_string)
    if not script_string then
        if self.scripts[funcname].string then
            script_string = self.scripts[funcname].string
        else
            error "Can't load an empty function."
        end
    end

    local full_string = "local func = function(self, data) " ..
        (script_string) .. " ; end ; return func"
    local success, loaded = serializer.load(full_string, { safe = false })

    if not success then error "Serializer couldn't load script as function." end

    if not self.scripts[funcname] then self.scripts[funcname] = {} end
    self.scripts[funcname].string = script_string
    self.scripts[funcname].func = (loaded --[[@as function]])
end

function Entity:run_script(funcname, params)
    if not self.scripts[funcname] then
        error(string.format("Warning: %s is not a valid function on this entity.", funcname))
    end

    if type(self.scripts[funcname].func) ~= "function" and not pcall(self.load_script, self, funcname) then
        error "Couldn't load script."
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
