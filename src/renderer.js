document.addEventListener(
  "DOMContentLoaded",

  async () => {

    setupNavigation();

    setupCodeModal();

    setupInstanceProgress();

    setupRam();

    setupAccountMenu();

    setupMicrosoftAuthEvents();


    await loadLauncherVersion();

    await loadInstances();

    await loadRamSettings();

    await loadAccountStatus();

  }
);


/* =========================================================
   VERSION
========================================================= */

async function loadLauncherVersion() {

  try {

    const version =
      await window
        .cloudyLauncher
        .getVersion();


    const element =
      document.getElementById(
        "launcher-version"
      );


    if (element) {

      element.textContent =
        `CloudyLauncher v${version}`;

    }

  } catch (error) {

    console.error(
      error
    );

  }

}


/* =========================================================
   NAVEGACIÓN
========================================================= */

function setupNavigation() {

  document
    .querySelectorAll(
      ".nav-item[data-page]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",

          () => {

            showPage(
              button.dataset.page
            );

          }
        );

      }
    );

}


function showPage(
  pageName
) {

  document
    .querySelectorAll(
      ".page"
    )
    .forEach(
      page => {

        page.classList.remove(
          "active"
        );

      }
    );


  document
    .getElementById(
      `page-${pageName}`
    )
    ?.classList
    .add(
      "active"
    );


  document
    .querySelectorAll(
      ".nav-item[data-page]"
    )
    .forEach(
      button => {

        button.classList.toggle(

          "active",

          button.dataset.page ===
            pageName

        );

      }
    );

}


/* =========================================================
   INSTANCIAS
========================================================= */

async function loadInstances() {

  try {

    const instances =
      await window
        .cloudyLauncher
        .getInstances();


    renderInstances(
      "instances-container",
      instances
    );


    renderInstances(
      "all-instances-container",
      instances
    );


    const count =
      document.getElementById(
        "instance-count"
      );


    if (count) {

      count.textContent =
        `${instances.length} disponible${
          instances.length === 1
            ? ""
            : "s"
        }`;

    }


  } catch (error) {

    console.error(
      "Error cargando instancias:",
      error
    );

  }

}


/* =========================================================
   RENDER
========================================================= */

function renderInstances(
  containerId,
  instances
) {

  const container =
    document.getElementById(
      containerId
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  if (
    !instances ||
    instances.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          ☁
        </div>

        <h3>
          No tienes instancias todavía
        </h3>

        <p>
          Introduce el código que recibiste
          para agregar una instancia.
        </p>

        <button
          class="primary-button empty-add-button"
        >
          + AGREGAR INSTANCIA
        </button>

      </div>

    `;


    container
      .querySelector(
        ".empty-add-button"
      )
      ?.addEventListener(
        "click",
        openCodeModal
      );


    return;

  }


  instances.forEach(
    instance => {

      container.appendChild(
        createInstanceCard(
          instance
        )
      );

    }
  );

}


/* =========================================================
   STATUS DE PASOS
========================================================= */

function getStepClass(
  installed
) {

  return installed
    ? "done"
    : "pending";

}


function getStepSymbol(
  installed
) {

  return installed
    ? "✓"
    : "○";

}


/* =========================================================
   TARJETA
========================================================= */

function createInstanceCard(
  instance
) {

  const card =
    document.createElement(
      "article"
    );


  card.className =
    "instance-card";


  card.dataset.instanceCard =
    instance.id;


  const setup =
    instance.setup || {};


  let buttonText =
    "INSTALAR";


  if (
    setup.ready
  ) {

    buttonText =
      "JUGAR";

  } else if (
    setup.any
  ) {

    buttonText =
      "CONTINUAR INSTALACIÓN";

  }


  const setupPanel =
    !setup.ready
      ? `

        <div class="setup-panel">

          <div
            class="setup-step ${getStepClass(
              setup.java?.installed
            )}"
            data-step="java"
          >

            <span class="setup-step-icon">
              ${getStepSymbol(
                setup.java?.installed
              )}
            </span>

            <span>
              Java 17
            </span>

          </div>


          <div
            class="setup-step ${getStepClass(
              setup.minecraft?.installed
            )}"
            data-step="minecraft"
          >

            <span class="setup-step-icon">
              ${getStepSymbol(
                setup.minecraft?.installed
              )}
            </span>

            <span>
              Minecraft ${instance.minecraftVersion}
            </span>

          </div>


          <div
            class="setup-step ${getStepClass(
              setup.forge?.installed
            )}"
            data-step="forge"
          >

            <span class="setup-step-icon">
              ${getStepSymbol(
                setup.forge?.installed
              )}
            </span>

            <span>
              Forge ${instance.loaderVersion}
            </span>

          </div>


          <div
            class="setup-step ${getStepClass(
              setup.files?.installed
            )}"
            data-step="files"
          >

            <span class="setup-step-icon">
              ${getStepSymbol(
                setup.files?.installed
              )}
            </span>

            <span>
              Archivos de instancia
            </span>

          </div>

        </div>

      `
      : `

        <div class="ready-badge">
          ✓ Lista para jugar
        </div>

      `;


  card.innerHTML = `

    <div class="instance-image">

      <div class="instance-badge">
        ${instance.category}
      </div>

      <div class="instance-icon">
        ${instance.icon}
      </div>

    </div>


    <div class="instance-info">


      <div class="instance-top">

        <div>

          <p class="eyebrow">
            ${instance.category}
          </p>

          <h2>
            ${instance.name}
          </h2>

        </div>


        <div class="${
          setup.ready
            ? "available"
            : "preparing-status"
        }">

          <span></span>

          ${
            setup.ready
              ? "Lista"
              : "Preparación pendiente"
          }

        </div>

      </div>



      <p class="instance-description">
        ${instance.description}
      </p>



      <div class="instance-details">

        <span>
          Minecraft ${instance.minecraftVersion}
        </span>

        <span>•</span>

        <span>
          ${instance.loader}
          ${instance.loaderVersion}
        </span>

        <span>•</span>

        <span>
          Pack ${instance.packVersion}
        </span>

      </div>



      ${setupPanel}



      <button
        class="instance-button ${
          setup.ready
            ? "play-button"
            : ""
        }"
      >
        ${buttonText}
      </button>



      <div
        class="global-install-progress hidden"
      >

        <div class="progress-header">

          <span class="global-progress-text">
            Preparando...
          </span>

          <strong class="global-progress-percent">
            0%
          </strong>

        </div>


        <div class="progress-track">

          <div
            class="progress-fill global-progress-fill"
          >
          </div>

        </div>

      </div>



      <p class="instance-message">
      </p>


    </div>

  `;


  const button =
    card.querySelector(
      ".instance-button"
    );


  button.addEventListener(
    "click",

    async () => {

      if (
        setup.ready
      ) {

        const message =
          card.querySelector(
            ".instance-message"
          );


        message.textContent =
          "✓ La instancia está lista. El próximo paso será conectar Microsoft y abrir Minecraft.";


        message.className =
          "instance-message success";


        return;

      }


      await installCompleteInstance(
        instance,
        button
      );

    }
  );


  return card;

}


/* =========================================================
   INSTALAR INSTANCIA COMPLETA
========================================================= */

async function installCompleteInstance(
  instance,
  button
) {

  button.disabled =
    true;


  button.textContent =
    "PREPARANDO...";


  showProgressForInstance(
    instance.id
  );


  try {

    const result =
      await window
        .cloudyLauncher
        .prepareInstance(
          instance.id
        );


    if (
      !result.ok
    ) {

      showInstanceMessage(

        instance.id,

        result.message,

        "error"

      );


      button.disabled =
        false;


      button.textContent =
        "CONTINUAR INSTALACIÓN";


      return;

    }


    showInstanceMessage(

      instance.id,

      "✓ Instalación completada.",

      "success"

    );


    setTimeout(
      async () => {

        await loadInstances();

      },
      700
    );


  } catch (error) {

    console.error(
      error
    );


    showInstanceMessage(

      instance.id,

      "Ocurrió un error durante la instalación.",

      "error"

    );


    button.disabled =
      false;


    button.textContent =
      "CONTINUAR INSTALACIÓN";

  }

}


/* =========================================================
   EVENTOS DE PROGRESO
========================================================= */

function setupInstanceProgress() {

  window
    .cloudyLauncher
    .onSetupProgress(
      data => {

        updateInstanceProgress(
          data
        );

      }
    );

}


function updateInstanceProgress(
  data
) {

  const cards =
    document.querySelectorAll(
      `[data-instance-card="${data.instanceId}"]`
    );


  cards.forEach(
    card => {

      const progressBox =
        card.querySelector(
          ".global-install-progress"
        );


      progressBox
        ?.classList
        .remove(
          "hidden"
        );


      const text =
        card.querySelector(
          ".global-progress-text"
        );


      const percent =
        card.querySelector(
          ".global-progress-percent"
        );


      const fill =
        card.querySelector(
          ".global-progress-fill"
        );


      if (
        text
      ) {

        text.textContent =
          data.message;

      }


      if (
        percent &&
        data.progress !== null
      ) {

        percent.textContent =
          `${data.progress}%`;

      }


      if (
        fill &&
        data.progress !== null
      ) {

        fill.style.width =
          `${data.progress}%`;

      }


      updateStepUI(
        card,
        data.steps,
        data.activeStep
      );


      const button =
        card.querySelector(
          ".instance-button"
        );


      if (
        button
      ) {

        if (
          data.error
        ) {

          button.textContent =
            "CONTINUAR INSTALACIÓN";


          button.disabled =
            false;

        } else if (
          data.progress === 100
        ) {

          button.textContent =
            "FINALIZANDO...";

        } else {

          button.textContent =
            "INSTALANDO...";

        }

      }

    }
  );

}


/* =========================================================
   PASOS VISUALES
========================================================= */

function updateStepUI(
  card,
  steps,
  activeStep
) {

  if (
    !steps
  ) {

    return;

  }


  Object.entries(
    steps
  ).forEach(
    (
      [
        stepName,
        status
      ]
    ) => {

      const step =
        card.querySelector(
          `[data-step="${stepName}"]`
        );


      if (
        !step
      ) {

        return;

      }


      step.classList.remove(
        "pending",
        "active",
        "done",
        "error"
      );


      let finalStatus =
        status;


      if (
        status === "pending" &&
        activeStep === stepName
      ) {

        finalStatus =
          "active";

      }


      step.classList.add(
        finalStatus
      );


      const icon =
        step.querySelector(
          ".setup-step-icon"
        );


      if (
        icon
      ) {

        if (
          finalStatus === "done"
        ) {

          icon.textContent =
            "✓";

        } else if (
          finalStatus === "active"
        ) {

          icon.textContent =
            "↓";

        } else if (
          finalStatus === "error"
        ) {

          icon.textContent =
            "!";

        } else {

          icon.textContent =
            "○";

        }

      }

    }
  );

}


/* =========================================================
   PROGRESO
========================================================= */

function showProgressForInstance(
  instanceId
) {

  document
    .querySelectorAll(
      `[data-instance-card="${instanceId}"]`
    )
    .forEach(
      card => {

        card
          .querySelector(
            ".global-install-progress"
          )
          ?.classList
          .remove(
            "hidden"
          );

      }
    );

}


/* =========================================================
   MENSAJE
========================================================= */

function showInstanceMessage(
  instanceId,
  message,
  type
) {

  document
    .querySelectorAll(
      `[data-instance-card="${instanceId}"]`
    )
    .forEach(
      card => {

        const element =
          card.querySelector(
            ".instance-message"
          );


        if (
          element
        ) {

          element.textContent =
            message;


          element.className =
            `instance-message ${type}`;

        }

      }
    );

}


/* =========================================================
   MODAL
========================================================= */

function setupCodeModal() {

  document
    .getElementById(
      "add-instance-nav"
    )
    ?.addEventListener(
      "click",
      openCodeModal
    );


  document
    .getElementById(
      "add-instance-button"
    )
    ?.addEventListener(
      "click",
      openCodeModal
    );


  document
    .getElementById(
      "close-code-modal"
    )
    ?.addEventListener(
      "click",
      closeCodeModal
    );


  document
    .getElementById(
      "cancel-code"
    )
    ?.addEventListener(
      "click",
      closeCodeModal
    );


  document
    .getElementById(
      "redeem-code"
    )
    ?.addEventListener(
      "click",
      redeemCode
    );


  document
    .getElementById(
      "instance-code-input"
    )
    ?.addEventListener(
      "keydown",

      event => {

        if (
          event.key ===
          "Enter"
        ) {

          redeemCode();

        }

      }
    );

}


function openCodeModal() {

  const modal =
    document.getElementById(
      "instance-code-modal"
    );


  const input =
    document.getElementById(
      "instance-code-input"
    );


  const message =
    document.getElementById(
      "code-message"
    );


  modal
    ?.classList
    .remove(
      "hidden"
    );


  if (
    input
  ) {

    input.value =
      "";


    setTimeout(
      () =>
        input.focus(),
      50
    );

  }


  if (
    message
  ) {

    message.textContent =
      "";


    message.className =
      "code-message";

  }

}


function closeCodeModal() {

  document
    .getElementById(
      "instance-code-modal"
    )
    ?.classList
    .add(
      "hidden"
    );

}


async function redeemCode() {

  const input =
    document.getElementById(
      "instance-code-input"
    );


  const message =
    document.getElementById(
      "code-message"
    );


  const button =
    document.getElementById(
      "redeem-code"
    );


  if (
    !input ||
    !message ||
    !button
  ) {

    return;

  }


  const code =
    input.value
      .trim()
      .toUpperCase();


  if (
    !code
  ) {

    message.textContent =
      "Escribe un código.";


    message.className =
      "code-message error";


    return;

  }


  button.disabled =
    true;


  button.textContent =
    "COMPROBANDO...";


  try {

    const result =
      await window
        .cloudyLauncher
        .redeemInstanceCode(
          code
        );


    if (
      !result.ok
    ) {

      message.textContent =
        result.message;


      message.className =
        "code-message error";


      return;

    }


    message.textContent =
      `✓ ${result.message}`;


    message.className =
      "code-message success";


    await loadInstances();


    setTimeout(
      () => {

        closeCodeModal();

        showPage(
          "instances"
        );

      },
      500
    );


  } catch (error) {

    console.error(
      error
    );


    message.textContent =
      "No se pudo comprobar el código.";


    message.className =
      "code-message error";


  } finally {

    button.disabled =
      false;


    button.textContent =
      "AGREGAR";

  }

}


/* =========================================================
   RAM
========================================================= */

function setupRam() {

  const slider =
    document.getElementById(
      "ram-slider"
    );


  slider
    ?.addEventListener(
      "input",

      () => {

        updateRamText(
          Number(
            slider.value
          )
        );

      }
    );


  slider
    ?.addEventListener(
      "change",

      async () => {

        const result =
          await window
            .cloudyLauncher
            .setRam(
              Number(
                slider.value
              )
            );


        slider.value =
          result.ramMB;


        updateRamText(
          result.ramMB
        );


        const message =
          document.getElementById(
            "ram-message"
          );


        if (
          message
        ) {

          message.textContent =
            `✓ ${formatRam(result.ramMB)} guardados para Minecraft.`;


          message.className =
            "settings-message success";

        }

      }
    );

}


async function loadRamSettings() {

  try {

    const settings =
      await window
        .cloudyLauncher
        .getRamSettings();


    const slider =
      document.getElementById(
        "ram-slider"
      );


    if (
      !slider
    ) {

      return;

    }


    slider.min =
      settings.minRamMB;


    slider.max =
      settings.maxRamMB;


    slider.value =
      settings.ramMB;


    document.getElementById(
      "ram-min"
    ).textContent =
      formatRam(
        settings.minRamMB
      );


    document.getElementById(
      "ram-max"
    ).textContent =
      formatRam(
        settings.maxRamMB
      );


    updateRamText(
      settings.ramMB
    );


  } catch (error) {

    console.error(
      "Error cargando RAM:",
      error
    );

  }

}


function updateRamText(
  ramMB
) {

  const element =
    document.getElementById(
      "ram-value"
    );


  if (
    element
  ) {

    element.textContent =
      formatRam(
        ramMB
      );

  }

}


function formatRam(
  ramMB
) {

  const gb =
    ramMB / 1024;


  return `${gb} GB`;

}


/* =========================================================
   CUENTA MICROSOFT
========================================================= */

let currentAccountStatus = {

  configured: true,

  signedIn: false,

  profile: null

};


function setupAccountMenu() {

  const control =
    document.getElementById(
      "account-control"
    );


  const trigger =
    document.getElementById(
      "account-trigger"
    );


  const menu =
    document.getElementById(
      "account-menu"
    );


  trigger
    ?.addEventListener(
      "click",

      event => {

        event.stopPropagation();


        const willOpen =
          menu
            ?.classList
            .contains(
              "hidden"
            );


        if (
          willOpen
        ) {

          openAccountMenu();

        } else {

          closeAccountMenu();

        }

      }
    );


  menu
    ?.addEventListener(
      "click",

      async event => {

        const button =
          event
            .target
            .closest(
              "[data-account-action]"
            );


        if (
          !button
        ) {

          return;

        }


        const action =
          button.dataset
            .accountAction;


        closeAccountMenu();


        if (
          action === "login"
        ) {

          await startMicrosoftLogin();

          return;

        }


        if (
          action === "switch"
        ) {

          await switchMicrosoftAccount();

          return;

        }


        if (
          action === "logout"
        ) {

          await logoutMicrosoftAccount();

          return;

        }


        if (
          action === "code"
        ) {

          openCodeModal();

          return;

        }


        if (
          action === "settings"
        ) {

          showPage(
            "settings"
          );

          return;

        }


        if (
          action === "quit"
        ) {

          window.close();

        }

      }
    );


  document.addEventListener(
    "click",

    event => {

      if (
        control &&
        !control.contains(
          event.target
        )
      ) {

        closeAccountMenu();

      }

    }
  );


  document.addEventListener(
    "keydown",

    event => {

      if (
        event.key ===
        "Escape"
      ) {

        closeAccountMenu();

        closeMicrosoftAuthModal();

      }

    }
  );


  document
    .getElementById(
      "close-microsoft-auth-modal"
    )
    ?.addEventListener(
      "click",
      closeMicrosoftAuthModal
    );


  document
    .getElementById(
      "hide-microsoft-auth-modal"
    )
    ?.addEventListener(
      "click",
      closeMicrosoftAuthModal
    );


  document
    .getElementById(
      "copy-microsoft-code"
    )
    ?.addEventListener(
      "click",
      copyMicrosoftCode
    );

}


function openAccountMenu() {

  const menu =
    document.getElementById(
      "account-menu"
    );


  const trigger =
    document.getElementById(
      "account-trigger"
    );


  menu
    ?.classList
    .remove(
      "hidden"
    );


  trigger
    ?.setAttribute(
      "aria-expanded",
      "true"
    );

}


function closeAccountMenu() {

  document
    .getElementById(
      "account-menu"
    )
    ?.classList
    .add(
      "hidden"
    );


  document
    .getElementById(
      "account-trigger"
    )
    ?.setAttribute(
      "aria-expanded",
      "false"
    );

}


async function loadAccountStatus() {

  try {

    const status =
      await window
        .cloudyLauncher
        .getAccountStatus();


    currentAccountStatus = {

      configured:
        status?.configured !== false,

      signedIn:
        Boolean(
          status?.signedIn
        ),

      profile:
        status?.profile || null

    };


    renderAccountUI(
      currentAccountStatus
    );


  } catch (error) {

    console.error(
      "Error comprobando la cuenta Microsoft:",
      error
    );


    currentAccountStatus = {

      configured: true,

      signedIn: false,

      profile: null

    };


    renderAccountUI(
      currentAccountStatus
    );

  }

}


function renderAccountUI(
  status
) {

  renderAccountAvatar(
    status
  );


  renderAccountMenu(
    status
  );

}


function renderAccountAvatar(
  status
) {

  const fallback =
    document.getElementById(
      "account-avatar-fallback"
    );


  const base =
    document.getElementById(
      "account-skin-base"
    );


  const overlay =
    document.getElementById(
      "account-skin-overlay"
    );


  const trigger =
    document.getElementById(
      "account-trigger"
    );


  const profile =
    status?.profile;


  const name =
    profile?.name ||
    "";


  const skins =
    Array.isArray(
      profile?.skins
    )
      ? profile.skins
      : [];


  const activeSkin =
    skins.find(
      skin =>
        String(
          skin?.state || ""
        ).toUpperCase() ===
        "ACTIVE"
    ) ||
    skins[0];


  const skinUrl =
    activeSkin?.url || "";


  if (
    status?.signedIn &&
    skinUrl
  ) {

    const cssUrl =
      `url("${String(
        skinUrl
      ).replace(
        /"/g,
        '\\"'
      )}")`;


    if (
      base
    ) {

      base.style.backgroundImage =
        cssUrl;


      base.classList.remove(
        "hidden"
      );

    }


    if (
      overlay
    ) {

      overlay.style.backgroundImage =
        cssUrl;


      overlay.classList.remove(
        "hidden"
      );

    }


    fallback
      ?.classList
      .add(
        "hidden"
      );


  } else {

    base
      ?.classList
      .add(
        "hidden"
      );


    overlay
      ?.classList
      .add(
        "hidden"
      );


    if (
      fallback
    ) {

      fallback.classList.remove(
        "hidden"
      );


      fallback.textContent =
        status?.signedIn &&
        name
          ? name
              .charAt(0)
              .toUpperCase()
          : "?";

    }

  }


  trigger
    ?.setAttribute(

      "aria-label",

      status?.signedIn
        ? `Cuenta de ${name}`
        : "Iniciar con Microsoft"

    );


  trigger
    ?.setAttribute(

      "title",

      status?.signedIn
        ? name
        : "Cuenta Microsoft"

    );

}


function renderAccountMenu(
  status
) {

  const menu =
    document.getElementById(
      "account-menu"
    );


  if (
    !menu
  ) {

    return;

  }


  if (
    status?.signedIn &&
    status?.profile
  ) {

    const safeName =
      escapeHtml(
        status.profile.name ||
        "Minecraft"
      );


    menu.innerHTML = `

      <div class="account-menu-profile">

        <div class="account-menu-status-dot">
        </div>

        <div>

          <strong>
            ${safeName}
          </strong>

          <span>
            Cuenta Microsoft
          </span>

        </div>

      </div>


      <div class="account-menu-divider">
      </div>


      <button
        class="account-menu-item"
        type="button"
        data-account-action="switch"
      >

        <span class="account-menu-icon">
          ↻
        </span>

        <span>
          Cambiar cuenta
        </span>

      </button>


      <button
        class="account-menu-item"
        type="button"
        data-account-action="logout"
      >

        <span class="account-menu-icon">
          ↪
        </span>

        <span>
          Cerrar sesión
        </span>

      </button>


      <div class="account-menu-divider">
      </div>


      <button
        class="account-menu-item"
        type="button"
        data-account-action="code"
      >

        <span class="account-menu-icon">
          ＋
        </span>

        <span>
          Colocar código
        </span>

      </button>


      <button
        class="account-menu-item"
        type="button"
        data-account-action="settings"
      >

        <span class="account-menu-icon">
          ⚙
        </span>

        <span>
          Ajustes
        </span>

      </button>


      <div class="account-menu-divider">
      </div>


      <button
        class="account-menu-item account-menu-danger"
        type="button"
        data-account-action="quit"
      >

        <span class="account-menu-icon">
          ×
        </span>

        <span>
          Salir
        </span>

      </button>

    `;


    return;

  }


  const loginDisabled =
    status?.configured === false;


  menu.innerHTML = `

    <button
      class="account-menu-item account-menu-primary"
      type="button"
      data-account-action="login"
      ${loginDisabled ? "disabled" : ""}
    >

      <span class="account-menu-icon microsoft-mini-mark">
        ⊞
      </span>

      <span class="account-menu-item-text">

        <strong>
          Iniciar con Microsoft
        </strong>

        <small>
          ${
            loginDisabled
              ? "Microsoft no está configurado"
              : "Usa tu cuenta de Minecraft"
          }
        </small>

      </span>

    </button>


    <div class="account-menu-divider">
    </div>


    <button
      class="account-menu-item"
      type="button"
      data-account-action="code"
    >

      <span class="account-menu-icon">
        ＋
      </span>

      <span>
        Colocar código
      </span>

    </button>


    <button
      class="account-menu-item"
      type="button"
      data-account-action="settings"
    >

      <span class="account-menu-icon">
        ⚙
      </span>

      <span>
        Ajustes
      </span>

    </button>


    <div class="account-menu-divider">
    </div>


    <button
      class="account-menu-item account-menu-danger"
      type="button"
      data-account-action="quit"
    >

      <span class="account-menu-icon">
        ×
      </span>

      <span>
        Salir
      </span>

    </button>

  `;

}


function setupMicrosoftAuthEvents() {

  window
    .cloudyLauncher
    .onAuthEvent(
      data => {

        handleMicrosoftAuthEvent(
          data
        );

      }
    );

}


function handleMicrosoftAuthEvent(
  data
) {

  if (
    !data
  ) {

    return;

  }


  const description =
    document.getElementById(
      "microsoft-auth-description"
    );


  const message =
    document.getElementById(
      "microsoft-auth-message"
    );


  const codeBox =
    document.getElementById(
      "microsoft-code-box"
    );


  const code =
    document.getElementById(
      "microsoft-user-code"
    );


  if (
    data.type ===
    "status"
  ) {

    openMicrosoftAuthModal();


    if (
      description
    ) {

      description.textContent =
        data.message ||
        "Conectando con Microsoft...";

    }


    return;

  }


  if (
    data.type ===
    "device-code"
  ) {

    openMicrosoftAuthModal();


    if (
      description
    ) {

      description.textContent =
        "Se abrió la página oficial de Microsoft. Introduce el código de abajo para autorizar tu cuenta.";

    }


    if (
      code
    ) {

      code.textContent =
        data.userCode ||
        "---- ----";

    }


    codeBox
      ?.classList
      .remove(
        "hidden"
      );


    if (
      message
    ) {

      message.textContent =
        "Esperando autorización de Microsoft...";


      message.className =
        "microsoft-auth-message";

    }


    return;

  }


  if (
    data.type ===
    "success"
  ) {

    if (
      description
    ) {

      description.textContent =
        "Cuenta conectada correctamente.";

    }


    if (
      message
    ) {

      message.textContent =
        `✓ ${
          data.profile?.name ||
          "Minecraft"
        } está conectada.`;


      message.className =
        "microsoft-auth-message success";

    }


    loadAccountStatus();


    setTimeout(
      closeMicrosoftAuthModal,
      900
    );

  }

}


async function startMicrosoftLogin() {

  resetMicrosoftAuthModal();

  openMicrosoftAuthModal();


  try {

    const result =
      await window
        .cloudyLauncher
        .loginMicrosoft();


    if (
      !result?.ok
    ) {

      showMicrosoftAuthError(

        result?.message ||
        "No se pudo iniciar sesión con Microsoft."

      );


      return;

    }


    await loadAccountStatus();


  } catch (error) {

    console.error(
      "Error de inicio de sesión Microsoft:",
      error
    );


    showMicrosoftAuthError(
      "No se pudo iniciar sesión con Microsoft."
    );

  }

}


async function logoutMicrosoftAccount() {

  try {

    const result =
      await window
        .cloudyLauncher
        .logoutMicrosoft();


    if (
      !result?.ok
    ) {

      console.error(
        result?.message ||
        "No se pudo cerrar la sesión."
      );

    }


    await loadAccountStatus();


  } catch (error) {

    console.error(
      "No se pudo cerrar la sesión Microsoft:",
      error
    );

  }

}


async function switchMicrosoftAccount() {

  await logoutMicrosoftAccount();

  await startMicrosoftLogin();

}


function openMicrosoftAuthModal() {

  document
    .getElementById(
      "microsoft-auth-modal"
    )
    ?.classList
    .remove(
      "hidden"
    );

}


function closeMicrosoftAuthModal() {

  document
    .getElementById(
      "microsoft-auth-modal"
    )
    ?.classList
    .add(
      "hidden"
    );

}


function resetMicrosoftAuthModal() {

  const description =
    document.getElementById(
      "microsoft-auth-description"
    );


  const message =
    document.getElementById(
      "microsoft-auth-message"
    );


  const codeBox =
    document.getElementById(
      "microsoft-code-box"
    );


  const code =
    document.getElementById(
      "microsoft-user-code"
    );


  if (
    description
  ) {

    description.textContent =
      "Preparando el inicio de sesión...";

  }


  if (
    message
  ) {

    message.textContent =
      "Conectando con Microsoft...";


    message.className =
      "microsoft-auth-message";

  }


  if (
    code
  ) {

    code.textContent =
      "---- ----";

  }


  codeBox
    ?.classList
    .add(
      "hidden"
    );

}


function showMicrosoftAuthError(
  text
) {

  openMicrosoftAuthModal();


  const description =
    document.getElementById(
      "microsoft-auth-description"
    );


  const message =
    document.getElementById(
      "microsoft-auth-message"
    );


  if (
    description
  ) {

    description.textContent =
      "Microsoft no pudo completar el inicio de sesión.";

  }


  if (
    message
  ) {

    message.textContent =
      text;


    message.className =
      "microsoft-auth-message error";

  }

}


async function copyMicrosoftCode() {

  const code =
    document.getElementById(
      "microsoft-user-code"
    )?.textContent
      ?.trim();


  if (
    !code ||
    code.includes(
      "----"
    )
  ) {

    return;

  }


  let copied =
    false;


  try {

    if (
      navigator.clipboard?.writeText
    ) {

      await navigator
        .clipboard
        .writeText(
          code
        );


      copied =
        true;

    }

  } catch (error) {

    copied =
      false;

  }


  if (
    !copied
  ) {

    const textarea =
      document.createElement(
        "textarea"
      );


    textarea.value =
      code;


    textarea.style.position =
      "fixed";


    textarea.style.opacity =
      "0";


    document.body.appendChild(
      textarea
    );


    textarea.select();


    copied =
      document.execCommand(
        "copy"
      );


    textarea.remove();

  }


  const message =
    document.getElementById(
      "microsoft-auth-message"
    );


  if (
    message
  ) {

    message.textContent =
      copied
        ? "✓ Código copiado."
        : "No se pudo copiar automáticamente. Puedes escribir el código manualmente.";


    message.className =
      copied
        ? "microsoft-auth-message success"
        : "microsoft-auth-message error";

  }

}


function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}

