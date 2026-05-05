/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_notifications_001",
    "created": "2026-05-03 22:30:00.000Z",
    "updated": "2026-05-03 22:30:00.000Z",
    "name": "notifications",
    "type": "base",
    "system": false,
    "listRule": "@request.auth.id != null",
    "viewRule": "@request.auth.id != null",
    "createRule": null,
    "updateRule": "@request.auth.id != null",
    "deleteRule": "@request.auth.id != null",
    "fields": [
      {
        "system": true,
        "id": "pbfld_id",
        "name": "id",
        "type": "primary",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "autoupdate": true,
        "onCreate": "",
        "onUpdate": "",
        "onDelete": ""
      },
      {
        "system": false,
        "id": "text_title",
        "name": "title",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "hidden": false,
        "autoupdate": false,
        "onCreate": "",
        "onUpdate": "",
        "onDelete": ""
      },
      {
        "system": false,
        "id": "text_message",
        "name": "message",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "hidden": false,
        "autoupdate": false,
        "onCreate": "",
        "onUpdate": "",
        "onDelete": ""
      },
      {
        "system": false,
        "id": "bool_isRead",
        "name": "isRead",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "autoupdate": false,
        "onCreate": "",
        "onUpdate": "",
        "default": false,
        "onDelete": ""
      },
      {
        "system": false,
        "id": "text_icon",
        "name": "icon",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "autoupdate": false,
        "onCreate": "",
        "onUpdate": "",
        "onDelete": ""
      },
      {
        "system": false,
        "id": "relation_userId",
        "name": "userId",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "autoupdate": false,
        "onCreate": "",
        "onUpdate": "",
        "collectionId": "users",
        "cascadeDelete": true,
        "minSelect": null,
        "maxSelect": 1,
        "displayFields": [],
        "onDelete": ""
      },
      {
        "system": true,
        "id": "pbfld_created",
        "name": "created",
        "type": "autodate",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "autoupdate": true,
        "onCreate": "",
        "onUpdate": "",
        "onDelete": ""
      },
      {
        "system": true,
        "id": "pbfld_updated",
        "name": "updated",
        "type": "autodate",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "autoupdate": true,
        "onCreate": "",
        "onUpdate": "",
        "onDelete": ""
      }
    ],
    "indexes": [
      "CREATE INDEX idx_notifications_created on notifications (created DESC)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_notifications_001")
  return app.delete(collection)
})
