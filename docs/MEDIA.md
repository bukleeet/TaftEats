# Media recovery

Run the read-only inventory from the updated application checkout:

```sh
npm run media:audit
```

The command uses the configured `MONGO_URI` and Cloudinary environment variables. It reads only avatar, review-media, and restaurant-image fields, then lists image and video uploads through the [Cloudinary Admin API](https://cloudinary.com/documentation/admin_api#get_resources). It does not update MongoDB, upload files, or delete assets.

The summary prints counts and the path to a private report in ignored `.cache/media-audits/`. The report contains public asset IDs and resource types, not account details or credentials:

- `missing`: references whose assets were absent from the completed provider inventory.
- `unreferenced`: assets at least 24 hours old with no current application reference.
- `recent`: unreferenced assets within the grace period, including uploads that may still be saving.
- `excluded`: assets outside the updated app's direct `tafteats/<id>` namespace. Nested paths are excluded, including the original app's preserved `tafteats/original_20261004/` copies.

Image and video IDs are compared separately. Provider pagination is followed for both types. Invalid, incomplete, duplicate, or repeating inventory responses fail the audit without writing a successful report. Resource limits are 10,000 database documents and 20 provider pages of up to 500 assets per resource type.

Treat the report as a point-in-time investigation aid. Database references and the provider inventory are not one atomic snapshot. Before removing an asset, stop application writes, rerun the audit, verify that no other application or retained recovery snapshot needs it, and preserve any media required for recovery. Review the specific asset in Cloudinary before taking action; this tool intentionally has no deletion mode. Missing assets may require restoring external media or correcting a reference after reviewing the affected record.

Run an audit after investigating `media_cleanup_failed` logs and after substantial deletion or migration work. Failed cleanup and a process crash between upload and save can leave an orphan; the inventory makes those assets discoverable. Cloudinary media is external to the encrypted MongoDB backups.

## Verified production inventory

On October 4, 2026, the read-only audit found 10 updated-application references and 10 matching assets, no missing assets, and no old unreferenced assets. It excluded the original application's 13 preserved media copies. This is a dated check, not a guarantee about future uploads.
