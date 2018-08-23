import { html, render } from "../dom";
import { interval, atom, pipe } from "../core";
import { map$ } from "../op/map";
import { subject } from "../op/subject";
import { combineLatest } from "../op/combineLatest";

const mount = document.createElement("div");
document.body.appendChild(mount);
mount.title = "mount";

const targetSize = 25;
const startTime = Date.now();

function App() {
  const phase$ = pipe(
    interval(1000),
    map$(t => Math.round(((t - startTime) / 1000) % 10)),
    subject
  );

  return html.div(
    {
      style: {
        position: "absolute",
        transformOrigin: "0 0",
        left: "50%",
        top: "50%",
        width: "10px",
        height: "10px",
        background: "#eee",
        transform: pipe(
          phase$,
          map$((t: number) => {
            const scale = 1 + (t > 5 ? 10 - t : t) / 10;
            return `scaleX(${scale / 2.5}) scaleY(0.7) translateZ(0.1px)`;
          })
        )
      }
    },
    ...SierpinskiTriangle({
      x: 0,
      y: 0,
      size: 1000,
      text: pipe(
        phase$,
        map$(timestamp => timestamp.toString())
      )
    })
  );
}

function SierpinskiTriangle(props: {
  x: number;
  y: number;
  size: number;
  text: AsyncIterable<string>;
}): AsyncIterable<HTMLElement>[] {
  if (props.size <= targetSize) {
    return [
      Dot({
        x: props.x - targetSize / 2,
        y: props.y - targetSize / 2,
        size: targetSize,
        text: props.text
      })
    ];
  }
  return [
    ...SierpinskiTriangle({
      x: props.x,
      y: props.y - props.size / 4,
      size: props.size / 2,
      text: props.text
    }),
    ...SierpinskiTriangle({
      x: props.x - props.size / 2,
      y: props.y + props.size / 4,
      size: props.size / 2,
      text: props.text
    }),
    ...SierpinskiTriangle({
      x: props.x + props.size / 2,
      y: props.y + props.size / 4,
      size: props.size / 2,
      text: props.text
    })
  ];
}

function Dot(props: {
  x: number;
  y: number;
  size: number;
  text: AsyncIterable<string>;
}) {
  const hover$ = atom(false);

  return html.div({
    onmouseover: () => {
      hover$.next(true);
    },
    onmouseout: () => {
      hover$.next(false);
    },
    style: {
      position: "absolute",
      font: "normal 15px sans-serif",
      textAlign: "center",
      cursor: "pointer",
      width: `${props.size}px`,
      height: `${props.size}px`,
      left: `${props.x}px`,
      top: `${props.y}px`,
      borderRadius: `${props.size / 2}px`,
      lineHeight: `${props.size}px`,
      background: pipe(
        hover$,
        map$(hover => (hover ? "#ff0" : "#61dafb"))
      )
    },
    innerText: pipe(
      combineLatest([hover$, props.text]),
      map$(([hover = false, text = ""]) => (hover ? `*${text}*` : text))
    )
  });
}

const { unsubscribe: stop } = render(mount, App());

declare global {
  interface NodeModule {
    hot: any;
  }
}

if ("hot" in module && module.hot) {
  module.hot.dispose(() => {
    document.body.removeChild(mount);
    stop();
  });
}