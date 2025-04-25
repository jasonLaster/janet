Great, I’ll explore the React PDF Viewer documentation, plugins, and examples to suggest improvements for your PR. I’ll focus on consolidating the headers, fixing thumbnail navigation and page highlighting, replicating the layout shown in the image with the search UI on the right, and restoring the floating chat UI as you had it before.

I'll get back to you with detailed recommendations and code snippets to support the improvements.

# Suggestions to Improve the PDF Viewer Implementation

_Example PDF viewer UI with a single consolidated header: the document title and info on the left, and search + actions on the right (as shown in the provided screenshot)._

## 1. Consolidate Headers with a Custom Toolbar

To remove the extra top header and merge its content into the PDF viewer’s toolbar, take advantage of **React PDF Viewer’s default layout plugin** and its toolbar customization APIs. The **Default Layout plugin** provides a built-in toolbar at the top of the viewer ([Create a toolbar with different slots for the default layout - React PDF Viewer](https://react-pdf-viewer.dev/examples/create-a-toolbar-with-different-slots-for-the-default-layout/#:~:text=This%20example%20demonstrates%20how%20we,by%20the%20Default%20Layout%20plugin)). You can inject custom elements (like a “Back” button, document title, and metadata) into this toolbar, replacing the separate header bar.

**Approach:** Use the `defaultLayoutPlugin` with a custom `renderToolbar` function. This lets you define exactly what goes into the toolbar. For example, you can create a left-aligned section containing a back button and document info, and a right-aligned section for search and other actions. The default layout plugin’s props include a `renderToolbar` callback to override the toolbar rendering ([Default Layout plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/default-layout#:~:text=,Custom%20toolbar%20renderer%202.0.0)). Here’s how you might implement it:

```jsx
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
// ... other imports for icons, plugins, etc.

const defaultLayoutPluginInstance = defaultLayoutPlugin({
  renderToolbar: (Toolbar) => (
    <Toolbar>
      {(slots) => {
        // Destructure default toolbar slots/components we want to use
        const {
          ShowSearchPopover,
          MoreActionsPopover,
          // (Plus any other default buttons you want to keep, e.g., Zoom, PageNav if needed)
        } = slots;
        return (
          <div
            className="pdf-toolbar"
            style={{ display: "flex", alignItems: "center", width: "100%" }}
          >
            {/* Left side: Back button + Title/Metadata */}
            <button onClick={handleBackClick} className="back-button">
              Back
            </button>
            <div className="doc-title">{docTitle}</div>
            <div className="doc-metadata">{docMetadata}</div>
            {/* Right side: push items to right */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* Search UI (see section 3 below) */}
              <ShowSearchPopover />
              {/* Actions dropdown (print/download/etc.) */}
              <MoreActionsPopover />
            </div>
          </div>
        );
      }}
    </Toolbar>
  ),
});

// Use the plugin in the Viewer
<Viewer
  fileUrl={pdfUrl}
  plugins={[defaultLayoutPluginInstance /* other plugins */]}
/>;
```

In the code above, we use `renderToolbar` to supply a custom toolbar layout. We include a **Back** button and document **title/metadata** on the left, then an empty flex space (`margin-left: auto`) to push the remaining items to the right. On the right, we include the search control and an actions menu. The default toolbar already provides a “More Actions” popover (the three-dot menu) and other controls as slots ([Customize the default toolbar - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-the-default-toolbar/#:~:text=Property%20Type%20Description%20From%20,0)) ([Customize the default toolbar - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-the-default-toolbar/#:~:text=2.0.0%20,0)), so you can reuse them. For example, `MoreActionsPopover` in the code corresponds to the default “...” menu (which typically includes options like Download, Print, etc. out-of-the-box ([Customize the default toolbar - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-the-default-toolbar/#:~:text=2.0.0%20,0))). The **Search** button (from `ShowSearchPopover`) will be handled in section 3.

By consolidating into one toolbar, you can remove the old top header component from the JSX entirely. All its functionality (back navigation and title display) is now inside the PDF viewer’s header. This approach ensures a single, unified header as shown in the screenshot. According to the official docs, _“the `default-layout` plugin brings the toolbar and a sidebar”_ that we can customize ([Create a toolbar with different slots for the default layout - React PDF Viewer](https://react-pdf-viewer.dev/examples/create-a-toolbar-with-different-slots-for-the-default-layout/#:~:text=This%20example%20demonstrates%20how%20we,by%20the%20Default%20Layout%20plugin)), and the `renderToolbar` option allows creating a custom toolbar layout within that area ([Default Layout plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/default-layout#:~:text=,Custom%20toolbar%20renderer%202.0.0)).

**Tips:** Style the new toolbar to match your app’s design (padding, background color, etc.) so it looks seamless. If needed, use the React PDF Viewer’s theming or override CSS. Ensure the Back button uses your routing logic (e.g., `onClick` might use `history.goBack()` if using React Router). The document title and metadata can come from your state or from the PDF’s info if available (you might extract it via the `Properties` plugin if needed).

## 2. Fix Thumbnail Navigation and Highlighting

For thumbnail navigation, leverage React PDF Viewer’s **Thumbnail plugin** to ensure correct page jumps and visual indication of the current page. The thumbnail sidebar should allow users to click a page thumbnail to jump to that page, and as the user scrolls through the document, the thumbnail corresponding to the visible page should be highlighted.

**Enable Thumbnail Click Navigation:** When using the thumbnail plugin’s `<Thumbnails>` component, clicking a thumbnail will by default navigate to the corresponding page ([Thumbnail plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/thumbnail/#:~:text=Thumbnail%20plugin)). Make sure you have integrated the plugin properly. For example:

```jsx
import { thumbnailPlugin } from "@react-pdf-viewer/thumbnail";
import "@react-pdf-viewer/thumbnail/lib/styles/index.css";

const thumbnailPluginInstance = thumbnailPlugin();
const { Thumbnails } = thumbnailPluginInstance;

// ... in the JSX:
<Viewer
  fileUrl={pdfUrl}
  plugins={[
    defaultLayoutPluginInstance,
    thumbnailPluginInstance /* other plugins */,
  ]}
/>;
{
  /* Render the thumbnail sidebar (if not using default layout’s built-in sidebar) */
}
<div className="thumbnail-panel">
  <Thumbnails />
</div>;
```

If you use the default layout plugin, the thumbnails tab can be shown as part of the sidebar automatically. The key is that the Thumbnail plugin’s `onJumpToPage` handler is wired in. The docs confirm that _“Clicking a particular thumbnail will jump to [the] associated page.”_ ([Thumbnail plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/thumbnail/#:~:text=Thumbnail%20plugin)). In a custom sidebar scenario, ensure you call `props.onJumpToPage` when rendering each thumbnail item. For instance, the default implementation of a thumbnail item is:

```jsx
const renderThumbnailItem = (props: RenderThumbnailItemProps) => (
  <div key={props.key}>
    {/* Jump to page on click */}
    <div onClick={props.onJumpToPage}>{props.renderPageThumbnail}</div>
    {props.renderPageLabel}
  </div>
);
```

As shown in the official example, the `RenderThumbnailItemProps` provides an `onJumpToPage` function to navigate, the thumbnail image element, and the page index/label ([Customize thumbnail items - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-thumbnail-items/#:~:text=Property%20Type%20Description%20From%20,0)) ([Customize thumbnail items - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-thumbnail-items/#:~:text=)). Using this ensures accurate navigation to the selected page.

**Highlight the Current Page’s Thumbnail:** To indicate which page is currently in view, use the `currentPage` property from `RenderThumbnailItemProps`. This property gives the index of the page currently visible in the main viewer ([Customize thumbnail items - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-thumbnail-items/#:~:text=Property%20Type%20Description%20From%20,0)). By comparing `props.pageIndex` to `props.currentPage` for each thumbnail, you can apply a highlight style to the active one. For example:

```jsx
const renderThumbnailItem = (props: RenderThumbnailItemProps) => {
  const isActive = props.pageIndex === props.currentPage;
  return (
    <div
      key={props.key}
      onClick={props.onJumpToPage}
      className={isActive ? "thumb-item active" : "thumb-item"}
    >
      {props.renderPageThumbnail}
      <div className="page-number-label">{props.renderPageLabel}</div>
    </div>
  );
};
```

Here we add an `'active'` class to the thumbnail `<div>` if it’s the current page. In CSS, you could then style `.thumb-item.active` with a distinct border or background (e.g., a blue border around the thumbnail) to highlight it. This way, as the user scrolls, the thumbnail corresponding to the visible page updates its styling. The Thumbnail plugin automatically updates `props.currentPage` as the document scrolls, so the highlight will move accordingly.

Make sure the thumbnail panel is scrollable and visible alongside the document. If using the default layout’s sidebar, it should handle scrolling of thumbnails for you (the library even auto-scrolls the thumbnail list to keep the current page in view ([Thumbnail plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/thumbnail/#:~:text=v3))). If you implemented a custom sidebar, you might need to ensure the container scrolls as needed.

By fixing the thumbnail click and highlighting, users will have a much better navigation experience. These changes align with React PDF Viewer’s intended usage of the thumbnail plugin for accurate page jumps and stateful highlight of the current page.

## 3. Add Search UI on the Right (Match the Desired Layout)

To mirror the layout in the screenshot, include the **search functionality** in the top header on the right side. React PDF Viewer offers a Search plugin that can be used to add search either as a simple button (which opens a search popover) or as a custom search input embedded directly in the toolbar.

**Basic Approach – Search Button:** The quickest solution is to use the Search plugin’s default button (a magnifying glass icon that toggles a search bar popover). This is included by default if you use the toolbar plugin or default layout ([Search plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/search/#:~:text=The%20,to%20search%20for%20given%20keyword)). In the custom toolbar we built in step 1, we included `ShowSearchPopover` – this is the default search button component. Ensure that you have the Search plugin enabled in the viewer. For example:

```jsx
import { searchPlugin } from "@react-pdf-viewer/search";
import "@react-pdf-viewer/search/lib/styles/index.css";

const searchPluginInstance = searchPlugin();
const { ShowSearchPopover } = searchPluginInstance;
```

Then in your toolbar layout (as shown earlier), include `<ShowSearchPopover />` in the right-side group. This will render the search icon. When clicked or when the user presses **Ctrl+F**, it opens a search input overlay. The Search plugin documentation notes that by default users can press Ctrl+F to open the search popover as well ([Search plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/search/#:~:text=By%20default%2C%20the%20shortcuts%20are,to%20open%20the%20search%20popover)). Using this approach keeps the UI minimal (just an icon) but still provides full search capability in a popover.

**Enhanced Approach – Inline Search Bar:** If the goal is to have an always-visible search box in the header (as it appears in some PDF viewers), you can create a custom search control using the plugin’s `<Search>` component. The `<Search>` component uses a render prop API to give you full control over the search UI ([Create a custom search control - React PDF Viewer](https://react-pdf-viewer.dev/examples/create-a-custom-search-control/#:~:text=import%20,viewer%2Fsearch)). For example, you can embed a text input, a “next” and “prev” button, and a close button in the toolbar itself:

```jsx
const { Search } = searchPluginInstance;
...
<div className="search-bar">
  <Search>
    {({ keyword, setKeyword, search, jumpToNextMatch, jumpToPreviousMatch, clearKeyword }) => (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="Search document..."
        />
        <button onClick={search}>Find</button>
        <button onClick={jumpToPreviousMatch}>⬆️</button>
        <button onClick={jumpToNextMatch}>⬇️</button>
        <button onClick={clearKeyword}>✖️</button>
      </div>
    )}
  </Search>
</div>
```

In this snippet, we use `Search` to get search functions and state. This lets the user type a query and navigate through matches with “next”/“previous” arrows. You would place this `<div className="search-bar">` in the toolbar’s right side (instead of or in addition to the icon). The Search plugin’s API provides everything needed: `search()` to execute the search, `jumpToNextMatch()`/`jumpToPreviousMatch()` to navigate hits, etc. ([Create a custom search control - React PDF Viewer](https://react-pdf-viewer.dev/examples/create-a-custom-search-control/#:~:text=The%20parameter%20,up%20a%20custom%20search%20control)). This approach gives a UX similar to the screenshot if a search box was shown there. Just be mindful of responsiveness (you might hide this on very small screens or use the popover instead if space is tight).

Whether you use the default popover or a custom inline search bar, the search plugin must be included in the Viewer’s plugins. The plugin is what actually performs text search within the PDF and highlights results. As the docs state, _“The search plugin provides a button or control to search for a given keyword.”_ and it’s included in the default toolbar by default ([Search plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/search/#:~:text=The%20,to%20search%20for%20given%20keyword)). By adding it to your plugin array (or via the default layout which includes it automatically), you activate the search capability.

**Final UI Touches:** Align the search UI to the far right of the header, as per the layout. In our custom toolbar, we already pushed it right with a flex container. You might want to adjust styling (e.g., margins around the search icon or input, making sure the header height accommodates the search box). Also, ensure the **actions dropdown** (the three-dot menu) is positioned correctly to the right of the search UI. You can use the `MoreIcon` or `MoreActionsPopover` from the toolbar plugin (which we did via `slots.MoreActionsPopover`) to get that menu ([Customize the default toolbar - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-the-default-toolbar/#:~:text=2.0.0%20,0)). The actions menu will contain things like Download, Print, etc. by default – verify that these actions work (the default layout’s toolbar plugin handles their functionality).

By implementing the search on the right side, your header will closely match the screenshot: back button and title on left; search field/icon and a menu on the right. This not only looks similar but also improves usability by exposing the search feature prominently.

## 4. Restore the Floating Chat UI

If a floating chat widget was part of the interface before, it should be brought back on top of the PDF viewer. This chat UI likely was an overlay allowing users to ask questions or collaborate. Restoring it involves re-mounting the chat component in the PDF viewer page and ensuring its styling/positioning is the same as before.

**Steps to Restore:**

- **Re-add the Chat Component:** Include the chat component JSX back into the page where the PDF viewer is rendered (if it was removed). For example, if previously you had `<ChatWidget />` or similar, re-insert that in the component tree. It should probably be a sibling to the `<Viewer>` component so that it can overlap it.

- **Maintain Position and Style:** The chat widget was described as _floating_, which implies it was absolutely positioned (for instance, at the bottom-right corner). Ensure the CSS for this component uses the same classes or styles as before (e.g., `position: absolute; bottom: 20px; right: 20px;` along with width/height or padding as needed). If the styles were deleted in the PR, retrieve them from version control or redefine them to match the original look and feel (background color, border radius, shadows, fonts, etc. should match the earlier design).

- **Z-index and Overflow:** Make sure the chat overlay appears on top of the PDF content. The PDF viewer canvas might have its own stacking context, so give the chat widget a higher `z-index` than the viewer container. For example:

  ```css
  .chat-widget {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    z-index: 1000; /* high value to ensure it overlays */
  }
  ```

  Also verify that the PDF viewer container is not clipping or hiding overflow. The default viewer shouldn’t interfere, but if you placed the viewer inside a container with `overflow: hidden`, the chat might not show. Ideally, place the chat at a level where it’s not a child of a clipping container, or use a portal to render it at the body level.

- **Original Behavior:** If the chat had functionality (e.g., draggable, minimizable, or loading certain data), test that these still work. For instance, if clicking the chat icon toggles it open/closed, ensure the event handlers are still connected. Restoring the component in the JSX and including any required scripts or context should bring back its behavior. Keep any logic the same – for example, if it was tied to a Redux store or context provider, make sure it’s wrapped in those as before.

By doing this, the floating chat will appear as it did originally, without interfering with the PDF viewer. Users will be able to see and use the chat while reading the PDF. Visually, this means your PDF viewer page will have the chat bubble/dialog layered on top, typically in a corner, maintaining the integrated feel of the application.

---

Using the above improvements, you leverage React PDF Viewer’s official plugins and customization hooks to achieve the desired UI/UX:

- A single, unified header (no duplicate bars) with navigation and info on the left and search/actions on the right.
- Thumbnail sidebar that correctly jumps to pages and highlights the current page as you scroll (using the Thumbnail plugin’s features for navigation ([Thumbnail plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/thumbnail/#:~:text=Thumbnail%20plugin)) and the `currentPage` prop for highlighting ([Customize thumbnail items - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-thumbnail-items/#:~:text=Property%20Type%20Description%20From%20,0))).
- A search interface integrated into the header for easy access to document text search (via the Search plugin ([Search plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/search/#:~:text=The%20,to%20search%20for%20given%20keyword)), with either the default popover or a custom search bar ([Create a custom search control - React PDF Viewer](https://react-pdf-viewer.dev/examples/create-a-custom-search-control/#:~:text=import%20,viewer%2Fsearch))).
- The floating chat widget restored to its original state, so it continues to provide its functionality without getting hidden by the new PDF viewer setup.

Each of these changes is backed by the React PDF Viewer documentation and examples, ensuring that you follow best practices. By implementing them, the pull request will result in a more polished PDF viewing component that matches the design and improves usability. Good luck with the updates!

**Sources:**

- React PDF Viewer Documentation – _Default Layout and Toolbar Customization_ ([Create a toolbar with different slots for the default layout - React PDF Viewer](https://react-pdf-viewer.dev/examples/create-a-toolbar-with-different-slots-for-the-default-layout/#:~:text=This%20example%20demonstrates%20how%20we,by%20the%20Default%20Layout%20plugin)) ([Default Layout plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/default-layout#:~:text=,Custom%20toolbar%20renderer%202.0.0))
- React PDF Viewer Documentation – _Search Plugin Usage_ ([Search plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/search/#:~:text=The%20,to%20search%20for%20given%20keyword)) ([Create a custom search control - React PDF Viewer](https://react-pdf-viewer.dev/examples/create-a-custom-search-control/#:~:text=import%20,viewer%2Fsearch))
- React PDF Viewer Documentation – _Thumbnail Plugin (Navigation and Customization)_ ([Thumbnail plugin - React PDF Viewer](https://react-pdf-viewer.dev/plugins/thumbnail/#:~:text=Thumbnail%20plugin)) ([Customize thumbnail items - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-thumbnail-items/#:~:text=Property%20Type%20Description%20From%20,0)) ([Customize thumbnail items - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-thumbnail-items/#:~:text=))
- React PDF Viewer Documentation – _Default Toolbar Slots and Actions_ ([Customize the default toolbar - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-the-default-toolbar/#:~:text=Property%20Type%20Description%20From%20,0)) ([Customize the default toolbar - React PDF Viewer](https://react-pdf-viewer.dev/examples/customize-the-default-toolbar/#:~:text=2.0.0%20,0))
