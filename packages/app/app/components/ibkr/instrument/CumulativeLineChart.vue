<script setup lang="ts">
import { useMouseInElement } from "@vueuse/core";
import { _adapters, Chart, type ChartConfiguration } from "chart.js/auto";
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import type { CumulativePoint } from "~/composables/useInstrumentStats";

_adapters._date.override({
  init() {},
  formats: () => ({ datetime: 'MMM d, yyyy', millisecond: 'h:mm:ss.SSS a', second: 'h:mm:ss a', minute: 'h:mm a', hour: 'hA', day: 'MMM d', week: 'll', month: 'MMM yyyy', quarter: '[Q]Q - YYYY', year: 'YYYY' }),
  parse: (value: unknown) => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return null;
  },
  format: (timestamp: number, _fmt: string) => {
    return new Date(timestamp).toLocaleDateString('en', { month: 'short', year: 'numeric' });
  },
  add: (timestamp: number, amount: number, unit: string) => {
    const d = new Date(timestamp);
    if (unit === 'month') d.setMonth(d.getMonth() + amount);
    else if (unit === 'year') d.setFullYear(d.getFullYear() + amount);
    else if (unit === 'day') d.setDate(d.getDate() + amount);
    else if (unit === 'hour') d.setHours(d.getHours() + amount);
    else if (unit === 'minute') d.setMinutes(d.getMinutes() + amount);
    else if (unit === 'second') d.setSeconds(d.getSeconds() + amount);
    else if (unit === 'millisecond') d.setMilliseconds(d.getMilliseconds() + amount);
    else if (unit === 'week') d.setDate(d.getDate() + amount * 7);
    else if (unit === 'quarter') d.setMonth(d.getMonth() + amount * 3);
    return d.getTime();
  },
  diff: (a: number, b: number, unit: string) => {
    const ms = a - b;
    if (unit === 'month') return (new Date(a).getFullYear() - new Date(b).getFullYear()) * 12 + new Date(a).getMonth() - new Date(b).getMonth();
    if (unit === 'year') return new Date(a).getFullYear() - new Date(b).getFullYear();
    if (unit === 'day') return Math.round(ms / 86400000);
    if (unit === 'hour') return Math.round(ms / 3600000);
    if (unit === 'minute') return Math.round(ms / 60000);
    if (unit === 'second') return Math.round(ms / 1000);
    if (unit === 'week') return Math.round(ms / 604800000);
    if (unit === 'quarter') return Math.round(ms / (91 * 86400000));
    return ms;
  },
  startOf: (timestamp: number, unit: string) => {
    const d = new Date(timestamp);
    if (unit === 'month' || unit === 'isoWeek') { d.setDate(1); d.setHours(0, 0, 0, 0); }
    else if (unit === 'year') { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); }
    else if (unit === 'day') d.setHours(0, 0, 0, 0);
    else if (unit === 'hour') d.setMinutes(0, 0, 0);
    else if (unit === 'minute') d.setSeconds(0, 0);
    else if (unit === 'second') d.setMilliseconds(0);
    return d.getTime();
  },
  endOf: (timestamp: number, unit: string) => {
    const d = new Date(timestamp);
    if (unit === 'month') { d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); }
    else if (unit === 'year') { d.setMonth(11, 31); d.setHours(23, 59, 59, 999); }
    else if (unit === 'day') d.setHours(23, 59, 59, 999);
    return d.getTime();
  },
});

const props = defineProps<{
  series: CumulativePoint[];
  baseCurrency: string;
  locale: string;
  xMin?: number;
  xMax?: number;
}>();

const expanded = ref(false);
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
const wrapperRef = useTemplateRef<HTMLDivElement>("wrapper");
let chart: Chart | null = null;

const { colors } = useChartTheme();

const tooltipTitle = ref('');
const tooltipBody = ref('');
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipVisible = ref(false);

const { isOutside } = useMouseInElement(wrapperRef);

watch(isOutside, (v) => { if (v) tooltipVisible.value = false; });

const currencyFormatter = computed(
  () =>
    new Intl.NumberFormat(props.locale, {
      style: "currency",
      currency: props.baseCurrency || "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
);

function buildConfig(compact: boolean): ChartConfiguration {
  const c = colors.value;
  return {
    type: "line",
    data: {
      datasets: [
        {
          data: props.series.map((p) => ({ x: p.date.toJSDate().getTime(), y: p.value })),
          borderColor: c.line,
          backgroundColor: c.fill,
          fill: true,
          stepped: 'before',
          pointRadius: 0,
          borderWidth: compact ? 1.5 : 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: ({ chart: ch, tooltip }) => {
            if (tooltip.opacity === 0) {
              tooltipVisible.value = false;
              return;
            }
            const item = tooltip.dataPoints?.[0];
            if (!item) return;
            tooltipTitle.value = new Date(item.parsed.x as number).toLocaleDateString(props.locale, { month: 'short', year: 'numeric' });
            tooltipBody.value = currencyFormatter.value.format(item.parsed.y ?? 0);
            // caretX/Y are relative to the canvas; convert to viewport coords for fixed positioning
            const canvasRect = ch.canvas.getBoundingClientRect();
            tooltipX.value = canvasRect.left + tooltip.caretX;
            tooltipY.value = canvasRect.top + tooltip.caretY;
            tooltipVisible.value = true;
          },
        },
      },
      scales: {
        x: {
          type: "time",
          display: !compact,
          grid: { color: c.grid },
          ticks: { color: c.ticks, maxRotation: 0, maxTicksLimit: 8 },
          time: { unit: "month", displayFormats: { month: "MMM yyyy" } },
          ...(props.xMin !== undefined ? { min: props.xMin } : {}),
          ...(props.xMax !== undefined ? { max: props.xMax } : {}),
          border: { color: c.grid },
        },
        y: {
          display: !compact,
          grid: { color: c.grid },
          ticks: {
            color: c.ticks,
            callback: (v) => currencyFormatter.value.format(v as number),
          },
          border: { color: c.grid },
        },
      },
    },
  };
}

function applyTheme() {
  if (!chart) return;
  const c = colors.value;
  const ds = chart.data.datasets[0];
  if (!ds) return;
  ds.borderColor = c.line;
  ds.backgroundColor = c.fill;
  const opts = chart.options;
  if (opts.scales?.x) {
    (opts.scales.x as Record<string, unknown>).grid = { color: c.grid };
    (opts.scales.x as Record<string, unknown>).ticks = { color: c.ticks, maxRotation: 0, maxTicksLimit: 8 };
    (opts.scales.x as Record<string, unknown>).border = { color: c.grid };
  }
  if (opts.scales?.y) {
    (opts.scales.y as Record<string, unknown>).grid = { color: c.grid };
    (opts.scales.y as Record<string, unknown>).ticks = {
      color: c.ticks,
      callback: (v: unknown) => currencyFormatter.value.format(v as number),
    };
    (opts.scales.y as Record<string, unknown>).border = { color: c.grid };
  }
  chart.update("none");
}

function rebuildChart() {
  chart?.destroy();
  if (!canvasRef.value) return;
  chart = new Chart(canvasRef.value, buildConfig(!expanded.value));
}

onMounted(() => rebuildChart());
onUnmounted(() => { chart?.destroy(); chart = null; });

watch(expanded, () => nextTick(rebuildChart));
watch(colors, applyTheme);
watch(
  () => props.series,
  () => {
    if (!chart) return;
    const ds = chart.data.datasets[0];
    if (ds) ds.data = props.series.map((p) => ({ x: p.date.toJSDate().getTime(), y: p.value }));
    chart.update("none");
  },
);
</script>

<template>
  <div ref="wrapper" class="relative w-full">
    <button
      type="button"
      class="w-full text-left"
      @click="expanded = !expanded"
    >
      <div
        class="w-full rounded-md overflow-hidden border app-border transition-all cursor-pointer"
        :class="expanded ? 'h-52' : 'h-14 hover:opacity-80'"
      >
        <canvas ref="canvas" class="w-full h-full" />
      </div>
    </button>

  </div>

  <Teleport to="body">
    <div
      v-if="tooltipVisible"
      class="pointer-events-none fixed z-[9999] card px-2.5 py-1.5 text-xs shadow-md -translate-x-1/2 -translate-y-full -mt-2 app-text"
      :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
    >
      <div class="font-medium">{{ tooltipTitle }}</div>
      <div>{{ tooltipBody }}</div>
    </div>
  </Teleport>
</template>
