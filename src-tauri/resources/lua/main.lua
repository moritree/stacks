local Entity = require('Entity')

return require('Scene'):new({
    entities = {
        test1 = Entity:new({
            type = "text",
            pos = { x = 100, y = 100 },
            content = [[vibing

next line]],
            scripts = {
                on_click = { string = "self.pos = { x = 200, y = 200 }" },
                on_tick = {
                    string = [[if self.pos.y > 100
    then self.pos.y = self.pos.y - 1
end]]
                }
            }
        }),
        test2 = Entity:new({
            type = "text",
            pos = { x = 200, y = 100 },
            content = "u can do it",
            selectable = true,
            draggable = true,
            scripts = { on_click = { string = "self.pos = { x = self.pos.x + 20, y = self.pos.y }" } }
        }),
        test3 = Entity:new({
            type = "rect",
            pos = { x = 100, y = 200 },
            size = { width = 200, height = 100 },
            color = "#ff0000"
        }),
    }
})
