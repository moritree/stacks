# Getting Started
## Install stacks

1. Clone the latest version of Stacks from the [GitHub repo](https://github.com/moritree/stacks).
2. Install dependencies: `yarn install`
3. Build the application for your OS: `yarn tauri build`

### Running a stack
Stacks can load scenes from files. Go to `File > Open` from the main application screen and select your file.
Similarly, you can save any changes through `File > Save`.

## Entities
In Stacks, any character or object that appears in a scene is called an **entity**. There are different types of
entities (e.g. text, shape, input) but they all have some core characteristics in common.

You can see and edit the properties of any entity with the **inspector window**. You can open the inspector window by
right-clicking on any entity and selecting `Inspect`. The properties of an entity are like a list of facts about it.
As the programmer, you are allowed to *change* these facts!

```lua title="A simple entity, as it would appear in the Inspector"
content = "Hello world!"
id = "hello",
pos = {
    x = 100,
    y = 200
},
type = "text"
```

### Universal properties

Every entity has a unique `id`, which is a *string*. (1)
{ .annotate }

1.  A piece of text — a "string" of zero or more characters.

    `"hello world"`, `"aaaaaaa"`, `"0"`, and `""` could all be strings.

Every entity has some kind of visual aspect — as long as it is not hidden (turned invisible),
you will see it rendered on the screen.

Every entity has an `x` and `y` position in the Scene.

- `x` is the position of the entity from left to right.
- `y` is the position of the entity from top to bottom.
- The position of an entity is measured from its top left corner.
- At the top left of the scene, `x = 0` and `y = 0`.
- The position at the bottom right of the scene is `x = 1280, y = 720`
  (no matter how you shrink or scale the scene window).

## Scripts
**Scripts** in Stacks are associated with specific **entities** and triggered by **events**.
Any entity can have any number of scripts.

The name of a script is also the name of the event that triggers it. So, for example, an `on_click` script will be
triggered when you click on the entity the script is attached to.

!!! Note
    Stacks uses the programming language [Lua](https://www.lua.org/) for scripting. Lua was chosen because it is a very
    small language with a simple set of rules. This means, compared to other languages, there are few Lua-specific
    quirks to learn and adapt to, so you can focus on the core logic of what you actually want to do.

### Writing scripts
When you open the Inspector for any given entity, you will notice that there are two tabs at the bottom of the window.
Click on the `Scripts` tab to start editing scripts.

The `+` button in the top right is used to add a new script. Click it, and type `on_click` into the input — this means
your script will be triggered when the user clicks on this entity.

Your scripts can use any of the basic Lua language features. Additionally:

- Scripts are able to access properties of the entity they belong to through the variable `self`.
    - For example, `self.pos` will give you the entity's position.
- Some events also come with data, which is passed to the corresponding script as a table in the `data` parameter.
    - For example, the `on_change` event for the `text_input` entity type passes the text currently in the input:
    `data = { text = "something"}`.
- You can use the `broadcast` and `message` functions to trigger other scripts ([more info](#triggering-other-scripts)).

You can combine any of these features in a script.

```lua title="Example: move this entity a bit to the right"
self.pos = {
    x = self.pos.x + 20,
    y = self.pos.y
}
```

### Built-in events

- `on_click`: Activated when you double click on the entity.
- `on_tick`: Activated on every "game tick", or frame of simulation.

Some entity types have access to different events, which don't apply universally.

- `on_change`
    - Applies to `"text_input"` entities.
    - Called every time you type or delete a character.
- `on_submit`
    - Applies to `"text_input"` entities.
    - Called when you press `enter` while focused on the input, letting the program know that you're done.

### Triggering other scripts
Sometimes, you want something to cause something else to happen, maybe on another entity. For example, if a player
touches lava, you might want the player to die and a life counter to decrement. But you can't change the properties of
one entity from a script on another, so you somehow need to trigger scripts on different entities at the same time.

**Broadcasting** and **messaging** are the two ways for scripts to trigger other scripts. They let you trigger scripts
on either the same or a different entity. In the case of broadcasting, you may even trigger multiple scripts at once.

=== "`broadcast(event, data)`"
    When you broadcast an event, it activates *any* matching script on *any* entity in the scene.
    ```lua
    broadcast("next_level")
    broadcast("monster_appeared", { at = { x = 50, y = 200 }})
    ```

=== "`message(target, event, data)`"
    Unlike broadcasts, messages are *targeted*. They will trigger a script on the named target entity.
    ```lua
    message("enemy_1", "take_damage", { damage = 2 })
    message("player", "get_item", { name = "Sword of Awesome", type = "Weapon"})
    ```

The parameters for these functions are:

- `target` (*only for `message`*): the ID of the entity you're sending the message to
- `event`: the name of the script you want to trigger
- `data` (*optional*): any additional information the script might want to use (as a table)
