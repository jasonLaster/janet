# Project

PDF OCR is an app that lets users upload PDFs and view them as they would in Google Drive or Apple Preview.

## Roadmap 2.0

- [ ] MVP
  - [ ] Secure and shareable URLs
  - [ ] In PDF search
- [ ] Nice to haves
  - [ ] PDFs show up as a sheet on the right
  - [ ] Rows are grouped by date
  - [ ] Everything is faster
  - [ ] Revisit search so that it is closer to Notion Mail

## Roadmap

- [x] Add clerk auth
- [x] Secure the backend
- [x] Add organizations so that D and I can be part of the same team
- [x] Deploy and test it out
- [x] Add playwright tests
- [x] Add labels
- [x] Add metadata
- [x] Make it real
  - [x] Google drive integration
  - [x] Metadata on upload
- [ ] Improve performance
  - [x] Instantly navigate to the list or pdf
  - [ ] prefetch PDFs
  - [x] use SWR
  - [x] store PDFs in IndexDB
- [ ] Improve search
  - [x] Search by text layer
  - [x] Mistral OCR
  - [x] Full text search
  - [ ] A better search results component
- [x] Clean up the UI
  - [x] sidebar
  - [ ] sheet
  - [ ] collapsible sections
  - [ ] show people in sidebar
  - [x] format dates
  - [x] clickable labels
  - [ ] Drag and drop should support multiple docs
  - [ ] Progress circle for uploads
- [x] Document metadata

  - [x] Get the metadata for a document
  - [x] Store it in a normalized state in the db
  - [x] Show the metadata in the sidebar

- [x] PDF features
  - [x] Improve the OCR for text layers
  - [x] Improve text selection so that it's similar to Apple Preview
- [x] LRU Cache
- [x] Use SWR
- [x] Full text search
- [x] Mistral OCR
- [x] Neon Text search
- [x] make tags clickable
- [] drag and drop multiple docs

## Features

- [x] Upload PDFs
- [x] List PDFs
- [x] View PDFs
- [ ] Rename PDF titles
- [ ] Label PDFs
- [ ] Chat with PDF
- [ ] OCR PDFs on upload
- [ ] Rename PDF titles on upload
- [ ] Accounts / Workspaces
-

## Chat with PDF

- [x] Don't show user the avatars
- [x] Messages should be formatted as markdown
- [x] Remove the PDF title from the top of the popover
- [ ] The popover should go on top of the chat button
- [ ] The user messages should be right aligned. The chat background should be light grey and should fit the text (not be full width)
- [ ] the ai messages should be transparent and light:grey background on hover
- [ ] there should be a chat button that opens the chat popover. When the popover opens it should be on top of the button.
- [ ] The popover header should show a close button. Do not show a collapse button.

## App Layout

- [ ] The sidebar should use shadcn sidebar
- [ ] PDFs should open via shadcn drawer from the right
- [ ] The sidebar should include a list of labels

## PDF Viewere

- [ ] Show the page navigation in the footer of the thumbnails sidebar.
  - [ ] Use flexbox so it's always visible and the thumbnails scroll
- [ ] Show actions like (zoom, download) in a dropdown that's to the right of the search box.
- [ ] Show the document title in the pdf viewer header and left position it
- [ ] make the pdf viewer fill the container

## On Upload

- [ ] PDFs should be saved to the DB and blob store
- [ ] PDF should be analyzed by AI
  - [ ] Come up with a new title
  - [ ] Summarized
  - [ ] Come up with labels
  - [ ] Get metadata: company name, document date, ...
- [ ] PDF should be OCR'd and the document should be updated based on the new text layer
