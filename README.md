# cliget-chrome

A Chrome extension to download files from the command line using aria2. This is a port of the [cliget Firefox extension](https://addons.mozilla.org/en-US/firefox/addon/cliget/) with only aria2 support.

## Features

- Automatically detects downloads in your browser
- Generates aria2c commands with all necessary cookies and headers
- Preserves authentication information for protected files
- Easy to use interface

## Usage

1. Install the extension from the Chrome Web Store or load it as an unpacked extension
2. Browse to a file you want to download
3. Click on the cliget-chrome icon in your toolbar
4. Click on the file entry to generate the aria2c command
5. Copy the command and run it in your terminal

## Options

- **Escape with double-quotes**: Use double quotes instead of single quotes (useful for Windows)
- **Exclude headers**: List of headers to exclude from the generated command
- **Extra aria2 arguments**: Additional command-line arguments to append to the aria2c command

## Privacy & Security Note

Be aware that the generated commands include cookies and authentication information from your browser. Do not share these commands with untrusted parties.

## License

Mozilla Public License 2.0 