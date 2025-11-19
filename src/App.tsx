import { proxy, transfer, wrap } from "comlink";
import { createEffect, createSignal, For, Show } from "solid-js";
import { render } from "solid-js/web";
import { clsx } from "clsx";
import { DropZone } from "./DropZone.tsx";
import type { obj } from "./pdfium-worker.ts";
import _styles from "./main.css?inline";

const _worker = new Worker(new URL("./pdfium-worker.ts", import.meta.url), {
  type: "module",
  name: "pdfium-worker",
});

const worker = wrap<typeof obj>(_worker);

// import styles from "./side.css" with { type: "css" };

// 乐，React 搞不了多根的状态同步吧
const [globalCount, setGlobalCount] = createSignal(0);

const [filePageCount, setFilePageCount] = createSignal(-1);

// let doc: PDFiumDocument | undefined = undefined;

const [docImages, setDocImages] = createSignal<Array<string | undefined>>([]);

const OVERVIEW = 0,
  PRESENTER = 1;

const [viewMode, setViewMode] = createSignal(OVERVIEW);

export function setDocImagesWrapper(index: number, url: string) {
  setDocImages((prev) => {
    const newArr = [...prev];
    newArr[index] = url;
    return newArr;
  });
}

function PopupRoot() {
  return (
    <div class="aspect-video">
      <div class="h-[min(100vh,calc(100vw*9/16))] w-[min(100vw,calc(100vh*16/9))] overflow-hidden">
        <Show when={docImages()[globalCount()]}>
          <img
            src={docImages()[globalCount()]}
            alt="slide"
            class="h-full w-auto object-cover object-left"
          />
        </Show>
      </div>
    </div>
  );
}

const handleFileSelect =
  (type: "no-notes" | "notes-right") => async (selectedFile: File) => {
    const u =
      "bytes" in Blob.prototype
        ? await selectedFile.bytes()
        : await selectedFile.arrayBuffer().then((buf) => new Uint8Array(buf));

    try {
      await worker.loadPDF(transfer(u, [u.buffer]));
      setFilePageCount(await worker.pageCount());
      for (let i = 0; i < filePageCount(); i++) {
        await worker.renderPDF(i, proxy(setDocImagesWrapper));
      }
      console.log(docImages());
    } catch (error) {
      console.error("Failed to process PDF:", error);
    } finally {
    }
  };

function App() {
  // let w: WindowProxy | null = null;
  const [w, setW] = createSignal<WindowProxy | null>(null);

  createEffect(() => {});

  const nextPage = () => {
    if (filePageCount() <= 0) return;
    setGlobalCount((prev) => Math.min(prev + 1, filePageCount() - 1));
    console.log("Current page:", globalCount());
  };

  return (
    <>
      <header></header>
      <main class="mx-10 my-10">
        <Show when={filePageCount() > 0} fallback={<SelectFile />}>
          <Show
            when={viewMode() === PRESENTER}
            fallback={
              <div class="mb-20 grid grid-cols-3 gap-4 p-4">
                <For each={Array(filePageCount()).fill(0)}>
                  {(_, index) => (
                    <div
                      class={clsx(
                        "aspect-video cursor-pointer outline transition-all",
                        {
                          "outline-cat-teal outline-4":
                            index() === globalCount(),
                          "outline-cat-surface2 hover:outline-4":
                            index() !== globalCount(),
                        },
                      )}
                      onClick={() => setGlobalCount(index())}
                    >
                      <Show when={docImages()[index()]}>
                        <img
                          src={docImages()[index()]}
                          class="h-full object-cover object-left"
                        />
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            }
          >
            {/* Left: hint */}
            {/* Right Top: Current page */}
            {/* Right Bottom: Next page */}
            <div class="grid h-full grid-cols-21 gap-4">
              <div class="col-span-13 flex items-center justify-center">
                <div class="aspect-video overflow-hidden">
                  <Show when={docImages()[globalCount()]}>
                    <img
                      src={docImages()[globalCount()]}
                      alt="current slide"
                      class="aspect-video h-full object-cover object-right"
                    />
                  </Show>
                </div>
              </div>
              <div class="col-span-8 flex flex-col items-center justify-center gap-4">
                <div class="aspect-video overflow-hidden">
                  <Show when={docImages()[globalCount()]}>
                    <img
                      src={docImages()[globalCount()]}
                      alt="current slide"
                      class="aspect-video h-full object-cover object-left"
                    />
                  </Show>
                </div>
                <div class="aspect-video overflow-hidden">
                  <Show when={docImages()[globalCount() + 1]}>
                    <img
                      src={docImages()[globalCount() + 1]}
                      alt="next slide"
                      class="aspect-video h-full cursor-pointer object-cover object-left opacity-50"
                      onclick={nextPage}
                    />
                  </Show>
                </div>
              </div>
            </div>
            {/* Bottom: notes */}
          </Show>
          {/* Control buttons */}
          <div class="pointer-events-none fixed bottom-4 left-4 flex justify-between gap-6 p-4">
            <CircleButton
              onClick={() => {
                if (filePageCount() <= 0) return;
                setGlobalCount((prev) => Math.max(0, prev - 1));
                console.log("Current page:", globalCount());
              }}
              classIcon="icon-[fluent--arrow-left-24-regular]"
              title="Previous page"
            />
            <CircleButton
              onClick={nextPage}
              classIcon="icon-[fluent--arrow-right-24-regular]"
              title="Next page"
            />
            <div
              class="text-cat-subtext0/50 outline-cat-subtext0/50 hover:outline-cat-subtext0 bg-cat-surface0/50 dark:bg-cat-surface0/70 hover:bg-cat-surface0/80 pointer-events-auto relative flex h-8 w-20 cursor-pointer place-content-between place-items-center rounded-full outline backdrop-blur-md transition-all"
              onclick={() => {
                setViewMode((prev) =>
                  prev === OVERVIEW ? PRESENTER : OVERVIEW,
                );
              }}
            >
              <div
                class={clsx(
                  "z-20 grid aspect-square h-full place-items-center rounded-full",
                  {
                    "text-cat-surface0/70 hover:outline-cat-subtext0 hover:text-cat-surface0":
                      viewMode() === OVERVIEW,
                  },
                  {
                    "": viewMode() !== OVERVIEW,
                  },
                )}
              >
                <button class="icon-[fluent--grid-24-filled] pointer-events-none aspect-square h-full" />
              </div>
              <div
                class={clsx(
                  "z-20 grid aspect-square h-full place-items-center rounded-full",
                  {
                    "text-cat-surface0/70 hover:outline-cat-subtext0 hover:text-cat-surface0":
                      viewMode() !== OVERVIEW,
                  },
                  {
                    "": viewMode() === OVERVIEW,
                  },
                )}
              >
                <button class="icon-[fluent--content-view-gallery-24-filled] pointer-events-none aspect-square h-full" />
              </div>
              <div
                class={clsx(
                  "bg-cat-subtext0/50 hover:bg-cat-subtext0/80 text-cat-surface0/70 absolute z-10 aspect-square h-full rounded-full border-4 border-transparent bg-clip-padding transition-all ease-in",
                  viewMode() === OVERVIEW ? "left-0" : "left-0 translate-x-12",
                )}
              />
            </div>
            <CircleButton
              onClick={() => {
                if (!w()) {
                  const _w = window.open(
                    "",
                    "",
                    "left=100,top=100,width=320,height=180",
                  );
                  setW(_w);
                  console.log(w());

                  // todo: when does vite support css import attributes?
                  // @ts-expect-error 误报
                  const styles = new (w().CSSStyleSheet)();
                  styles.replaceSync(_styles);
                  w()?.document.adoptedStyleSheets?.push(styles);
                  render(
                    () => <PopupRoot />,
                    w()!.document!.querySelector("body")!,
                  );
                } else {
                  w()?.close();
                  setW(null);
                }
              }}
              // iconClass="icon-[fluent--window-new-24-filled]"
              classIcon="icon-[mdi--projector] scale-125"
              toggled={!!w()}
              title="Show slide in new window"
              toggledTitle="Close slide window"
            />
          </div>
          {/* ends */}
        </Show>
      </main>
      <footer></footer>
    </>
  );
}

function CircleButton(props: {
  onClick: () => void;
  classIcon: string;
  title: string;
  toggled?: boolean;
  toggledTitle?: string;
}) {
  return (
    <div
      class={clsx(
        "pointer-events-auto grid h-8 w-8 cursor-pointer place-items-center rounded-full outline backdrop-blur-md transition-all",
        {
          // when toggled, highlight background, dim text
          "bg-cat-subtext0/50 text-cat-surface0/70 outline-cat-subtext0/50 hover:outline-cat-subtext0 hover:text-cat-surface0 hover:bg-cat-subtext0/80":
            props.toggled,
          "text-cat-subtext0/50 outline-cat-subtext0/50 hover:outline-cat-subtext0 hover:text-cat-subtext0 bg-cat-surface0/50 dark:bg-cat-surface0/70 hover:bg-cat-surface0/80":
            !props.toggled,
        },
      )}
      onClick={props.onClick}
    >
      <button
        class={clsx(props.classIcon, "cursor-pointer")}
        title={props.toggled ? props.toggledTitle : props.title}
      />
    </div>
  );
}

function SelectFile() {
  return (
    <>
      <h1 class="text-4xl font-extrabold">PDF Presenter View</h1>
      <div class="mt-30 grid h-80 w-full grid-cols-2 gap-16 px-10 lg:px-20">
        <DropZone type="no-notes" onFileSelect={handleFileSelect("no-notes")} />
        <DropZone
          type="notes-right"
          onFileSelect={handleFileSelect("notes-right")}
        />
      </div>
    </>
  );
}

export default App;
