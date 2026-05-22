/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1075493968")

  // update collection data
  unmarshal({
    "otp": {
      "duration": 300,
      "enabled": true,
      "length": 6
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1075493968")

  // update collection data
  unmarshal({
    "otp": {
      "duration": 180,
      "enabled": false,
      "length": 8
    }
  }, collection)

  return app.save(collection)
})
