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
            scripts = { on_click = { string = "self.pos = { x = self.pos.x + 20, y = self.pos.y }" } }
        }),
        test3 = Entity:new({
            type = "rect",
            pos = { x = 100, y = 200 },
            size = { width = 200, height = 100 },
            color = "#ff0000"
        }),
        testinput = Entity:new({
            type = "text_input",
            pos = { x = 100, y = 600 },
            size = { width = 200, height = 50 },
            color = "#dddddd"
        }),
        test4 = Entity:new({
            type = "svg",
            pos = { x = 600, y = 200 },
            size = { width = 300, height = 300 },
            content = [[<circle cx="50" cy="50" r="50" fill="olive" />]]
        })
    }
})
