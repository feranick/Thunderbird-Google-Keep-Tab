# Google Keep Tab
Unofficial Google Keep add-on for Thunderbird, it adds a button that opens a Google Keep tab in Thunderbird.
The [home page](https://addons.mozilla.org/thunderbird/addon/thunderckeep/) of the extension contains some pictures and reviews.

#### Installing 
A new Google Keep icon should appear in the top-right corner of Thunderbird. Click to open.

#### Installing from sources
Download the repository, zip it, rename it to Google-Keep-Tab.xpi and choose install addon from file in Thunderbird.

In linux the xpi file can be created with the following commands
* `git clone https://github.com/feranick/Thunderbird-Google-Keep-Tab`
* `cd ./Thunderbird-Google-Keep-Tab`
* `VERSION=$(cat ./manifest.json | jq --raw-output '.version')`
* `zip -r "../Google-Keep-Tab-${VERSION}-tb.xpi" *`
