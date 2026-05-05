/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2604721141")

  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "bool1948001014",
    "name": "activeForMentor",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2604721141")

  collection.fields.removeById("bool1948001014")

  return app.save(collection)
})
