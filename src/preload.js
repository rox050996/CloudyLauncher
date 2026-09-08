const {
  contextBridge,
  ipcRenderer
} = require("electron");


contextBridge.exposeInMainWorld(
  "cloudyLauncher",

  {

    /* =====================================================
       LAUNCHER
    ===================================================== */

    getVersion: () =>
      ipcRenderer.invoke(
        "launcher:get-version"
      ),


    /* =====================================================
       INSTANCIAS
    ===================================================== */

    getInstances: () =>
      ipcRenderer.invoke(
        "instances:list"
      ),


    redeemInstanceCode:
      code =>
        ipcRenderer.invoke(
          "instances:redeem-code",
          code
        ),


    prepareInstance:
      instanceId =>
        ipcRenderer.invoke(
          "instance:prepare",
          instanceId
        ),


    onSetupProgress:
      callback => {

        ipcRenderer.on(
          "instance:setup-progress",

          (
            event,
            data
          ) => {

            callback(
              data
            );

          }
        );

      },


    /* =====================================================
       MICROSOFT
    ===================================================== */

    getAccountStatus: () =>
      ipcRenderer.invoke(
        "auth:get-status"
      ),


    loginMicrosoft: () =>
      ipcRenderer.invoke(
        "auth:login"
      ),


    logoutMicrosoft: () =>
      ipcRenderer.invoke(
        "auth:logout"
      ),


    onAuthEvent:
      callback => {

        ipcRenderer.on(
          "auth:event",

          (
            event,
            data
          ) => {

            callback(
              data
            );

          }
        );

      },


    /* =====================================================
       RAM
    ===================================================== */

    getRamSettings: () =>
      ipcRenderer.invoke(
        "settings:get-ram"
      ),


    setRam:
      ramMB =>
        ipcRenderer.invoke(
          "settings:set-ram",
          ramMB
        )

  }
);
