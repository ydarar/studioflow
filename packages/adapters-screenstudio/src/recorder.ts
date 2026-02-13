import {
  activateScreenStudio,
  clickRecordMenuItem,
  pressReturn,
  wait
} from "./menu-controls.js";

const appName = process.env.SCREENSTUDIO_APP_NAME ?? "Screen Studio";

function int(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const preConfirmDelay = int(process.env.SCREENSTUDIO_PRE_CONFIRM_DELAY_MS, 800);
const postStartDelay = int(process.env.SCREENSTUDIO_POST_START_DELAY_MS, 1200);
const postStopDelay = int(process.env.SCREENSTUDIO_POST_STOP_DELAY_MS, 800);
const exportDialogConfirmDelay = int(process.env.SCREENSTUDIO_EXPORT_DIALOG_CONFIRM_DELAY_MS, 800);
const exportDelay = int(process.env.SCREENSTUDIO_EXPORT_DELAY_MS, 2500);

export async function startRecording() {
  await activateScreenStudio(appName);
  await clickRecordMenuItem(appName, "Record display");
  await wait(preConfirmDelay);
  await pressReturn();
  await wait(postStartDelay);
}

export async function stopRecording() {
  await activateScreenStudio(appName);
  await clickRecordMenuItem(appName, "Stop recording");
  await wait(postStopDelay);
}

export async function exportRecording() {
  await activateScreenStudio(appName);
  await clickRecordMenuItem(appName, "Export and save to file");
  await wait(exportDialogConfirmDelay);
  await pressReturn();
  await wait(exportDelay);
}
