<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from "vue-router";
import WizardStepper from "~/components/ui/WizardStepper.vue";
import { ReportStep } from "~/types/reportFlow";

// The report flow: a page per step below this one, which holds what the steps hand on. One key in
// every language, so switching language keeps the flow and what it holds.
definePageMeta({ key: "report" });

const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const flow = provideReportFlow();

useSeoMeta({ title: () => t("app_title") });

const stepLabels = computed(() => flow.steps.map((step) => t(reportStepKeys[step])));

// The step a path asks for, or the first step that's missing when the flow can't show it yet.
function shownStepOf(path: string): ReportStep {
	return flow.stepShownFor(flow.stepOfPath(path) ?? ReportStep.UPLOAD);
}

const shownStep = computed(() => shownStepOf(route.path));

function goTo(step: ReportStep, replace: boolean) {
	return navigateTo(localePath(`/report/${step}`), { replace });
}

// A step opened without what it needs goes to the first step that's missing: here when the flow
// is opened (a reload, a shared link, the flow's own address), and in the guard below when moving
// inside it. Redirecting before the step renders keeps the pages kept so far.
if (flow.stepOfPath(route.path) !== shownStep.value) {
	goTo(shownStep.value, true);
}
onBeforeRouteUpdate((to) => {
	const shown = shownStepOf(to.path);
	if (flow.stepOfPath(to.path) !== shown) {
		return localePath(`/report/${shown}`);
	}
});

function onNavigate(position: number) {
	const step = flow.steps[position - 1];
	if (step !== undefined) {
		goTo(step, false);
	}
}

// Each step page is kept as it was left until what it shows is gone (see the flow's pageKeyOf).
function pageKey(pageRoute: RouteLocationNormalizedLoaded): string {
	const step = flow.stepOfPath(pageRoute.path);
	return step === null ? pageRoute.path : flow.pageKeyOf(step);
}
</script>

<template>
	<div class="py-8 flex flex-col gap-6">
		<h1 class="sr-only">{{ t(reportStepKeys[shownStep]) }}</h1>
		<WizardStepper
			:steps="stepLabels"
			:current-step="flow.steps.indexOf(shownStep) + 1"
			:max-step="flow.steps.indexOf(flow.furthestStep.value) + 1"
			@navigate="onNavigate"
		/>
		<NuxtPage :keepalive="{ max: 8 }" :page-key="pageKey" />
	</div>
</template>
