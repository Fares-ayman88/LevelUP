/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_955655590")

  // add field
  collection.fields.addAt(16, new Field({
    "hidden": false,
    "id": "file4007155999",
    "maxSelect": 99,
    "maxSize": 209715200,
    "mimeTypes": [
      "video/x-m4v",
      "video/quicktime",
      "video/mp4"
    ],
    "name": "lessonVideos",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_955655590")

  // remove field
  collection.fields.removeById("file4007155999")

  return app.save(collection)
})
