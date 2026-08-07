const { check } = window.__TAURI__.updater;
const { relaunch } = window.__TAURI__.process;
const { confirm, message } = window.__TAURI__.dialog;

const statusElement = document.getElementById("update-status");
const updateButton = document.getElementById("check-updates-button");

let updateCheckRunning = false;

/**
 * Zeigt einen Status in der App und in der Entwicklerkonsole an.
 */
function setStatus(statusMessage) {
  if (statusElement) {
    statusElement.textContent = statusMessage;
  }

  console.log(`[Updater] ${statusMessage}`);
}

/**
 * Wandelt unterschiedliche Fehlerarten in lesbaren Text um.
 */
function errorToText(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Prüft, ob ein Update verfügbar ist, und installiert es nach Bestätigung.
 *
 * manualCheck:
 * true  = Prüfung wurde über den Button gestartet
 * false = automatische Prüfung beim App-Start
 */
async function checkForUpdates(manualCheck = false) {
  if (updateCheckRunning) {
    console.log("[Updater] Eine Updatesuche läuft bereits.");
    return;
  }

  updateCheckRunning = true;

  if (updateButton) {
    updateButton.disabled = true;
  }

  let currentStep = "Updatesuche";

  try {
    setStatus("Schritt 1: Suche nach Updates …");

    const update = await check({
      timeout: 30_000,
    });

    if (!update) {
      setStatus("Die App ist bereits aktuell.");

      if (manualCheck) {
        await message("Es ist kein neues Update verfügbar.", {
          title: "Keine Updates",
          kind: "info",
        });
      }

      return;
    }

    currentStep = "Bestätigungsdialog";

    setStatus(
      `Schritt 2: Neue Version ${update.version} ist verfügbar.`
    );

    const releaseNotes = update.body
      ? `\n\nÄnderungen:\n${update.body}`
      : "";

    const shouldInstall = await confirm(
      `Version ${update.version} ist verfügbar.${releaseNotes}\n\nJetzt herunterladen und installieren?`,
      {
        title: "Update verfügbar",
        kind: "info",
        okLabel: "Installieren",
        cancelLabel: "Später",
      }
    );

    if (!shouldInstall) {
      setStatus("Das Update wurde auf später verschoben.");
      return;
    }

    currentStep = "Download und Installation";

    setStatus("Schritt 3: Update wird heruntergeladen …");

    let downloadedBytes = 0;
    let totalBytes = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          totalBytes = event.data.contentLength ?? 0;

          setStatus("Update wird heruntergeladen …");
          break;

        case "Progress":
          downloadedBytes += event.data.chunkLength;

          if (totalBytes > 0) {
            const percent = Math.round(
              (downloadedBytes / totalBytes) * 100
            );

            setStatus(
              `Update wird heruntergeladen: ${percent} %`
            );
          } else {
            setStatus("Update wird heruntergeladen …");
          }

          break;

        case "Finished":
          setStatus(
            "Download abgeschlossen. Update wird installiert …"
          );
          break;

        default:
          console.log(
            "[Updater] Unbekanntes Download-Ereignis:",
            event
          );
      }
    });

    currentStep = "Neustart";

    setStatus(
      "Update wurde installiert. App wird neu gestartet …"
    );

    await relaunch();
  } catch (error) {
    const errorText = errorToText(error);

    console.error(
      `[Updater] Fehler bei „${currentStep}“:`,
      error
    );

    setStatus(
      `Fehler bei „${currentStep}“: ${errorText}`
    );

    if (manualCheck) {
      try {
        await message(
          `Schritt: ${currentStep}\n\n${errorText}`,
          {
            title: "Updater-Fehler",
            kind: "error",
          }
        );
      } catch (dialogError) {
        console.error(
          "[Updater] Auch der Fehlerdialog konnte nicht geöffnet werden:",
          dialogError
        );
      }
    }
  } finally {
    updateCheckRunning = false;

    if (updateButton) {
      updateButton.disabled = false;
    }
  }
}

/**
 * Manuelle Prüfung über den Button.
 */
updateButton?.addEventListener("click", () => {
  checkForUpdates(true);
});

/**
 * Automatische Prüfung 1,5 Sekunden nach dem App-Start.
 */
window.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(() => {
    checkForUpdates(false);
  }, 1500);
});