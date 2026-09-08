const fs = require("fs");
const path = require("path");

const {
  safeStorage,
  shell
} = require("electron");

const {
  PublicClientApplication
} = require("@azure/msal-node");

const {
  MicrosoftAuthenticator
} = require("@xmcl/user");


const MICROSOFT_SCOPES = [
  "XboxLive.signin",
  "offline_access"
];


/* =========================================================
   CREAR SERVICIO
========================================================= */

function createMicrosoftAuth({
  dataRoot,
  clientId
}) {

  const authRoot =
    path.join(
      dataRoot,
      "auth"
    );


  const cachePath =
    path.join(
      authRoot,
      "msal-cache.dat"
    );


  const profilePath =
    path.join(
      authRoot,
      "minecraft-profile.json"
    );


  let pca = null;


  /* =======================================================
     VALIDAR CONFIGURACIÓN
  ======================================================= */

  function validateClientId() {

    if (
      !clientId ||
      typeof clientId !== "string" ||
      clientId.trim() === "" ||
      clientId.includes("PEGA-AQUI") ||
      clientId.includes("TU-ID")
    ) {

      const error =
        new Error(
          "CloudyLauncher todavía no tiene configurado el Id. de aplicación de Microsoft."
        );


      error.code =
        "MICROSOFT_NOT_CONFIGURED";


      throw error;

    }

  }


  /* =======================================================
     CREAR CARPETA AUTH
  ======================================================= */

  async function ensureAuthRoot() {

    await fs.promises.mkdir(
      authRoot,
      {
        recursive: true
      }
    );

  }


  /* =======================================================
     CACHE CIFRADA DE MICROSOFT
  ======================================================= */

  async function readTokenCache() {

    try {

      if (
        !fs.existsSync(cachePath)
      ) {

        return "";

      }


      /*
       * No queremos guardar tokens sin cifrar.
       * Si Windows/Electron no puede descifrarlos,
       * simplemente pediremos iniciar sesión otra vez.
       */

      if (
        !safeStorage.isEncryptionAvailable()
      ) {

        console.warn(
          "safeStorage no está disponible. No se cargará la sesión persistente."
        );


        return "";

      }


      const encoded =
        await fs.promises.readFile(
          cachePath,
          "utf8"
        );


      if (
        !encoded ||
        encoded.trim() === ""
      ) {

        return "";

      }


      const encrypted =
        Buffer.from(
          encoded,
          "base64"
        );


      return safeStorage.decryptString(
        encrypted
      );


    } catch (error) {

      console.error(
        "No se pudo leer la sesión de Microsoft:",
        error
      );


      return "";

    }

  }


  async function writeTokenCache(
    serializedCache
  ) {

    try {

      await ensureAuthRoot();


      if (
        !safeStorage.isEncryptionAvailable()
      ) {

        /*
         * Es preferible volver a iniciar sesión
         * la próxima vez antes que escribir tokens
         * de Microsoft sin cifrar.
         */

        console.warn(
          "safeStorage no está disponible. La sesión no se guardará en disco."
        );


        return;

      }


      const encrypted =
        safeStorage.encryptString(
          serializedCache
        );


      await fs.promises.writeFile(
        cachePath,
        encrypted.toString("base64"),
        "utf8"
      );


    } catch (error) {

      console.error(
        "No se pudo guardar la sesión de Microsoft:",
        error
      );

    }

  }


  /* =======================================================
     CREAR MSAL
  ======================================================= */

  function getPCA() {

    validateClientId();


    if (
      pca
    ) {

      return pca;

    }


    const cachePlugin = {

      beforeCacheAccess:
        async context => {

          const serializedCache =
            await readTokenCache();


          if (
            serializedCache
          ) {

            context
              .tokenCache
              .deserialize(
                serializedCache
              );

          }

        },


      afterCacheAccess:
        async context => {

          if (
            context.cacheHasChanged
          ) {

            const serializedCache =
              context
                .tokenCache
                .serialize();


            await writeTokenCache(
              serializedCache
            );

          }

        }

    };


    pca =
      new PublicClientApplication({

        auth: {

          clientId:
            clientId.trim(),

          /*
           * Nuestra App Registration está pensada
           * para cuentas personales Microsoft.
           */

          authority:
            "https://login.microsoftonline.com/consumers"

        },


        cache: {
          cachePlugin
        }

      });


    return pca;

  }


  /* =======================================================
     PERFIL LOCAL
  ======================================================= */

  async function saveProfile(
    profile
  ) {

    await ensureAuthRoot();


    /*
     * Aquí NO guardamos access tokens.
     * Solo datos públicos necesarios para mostrar
     * la cuenta en el launcher.
     */

    const safeProfile = {

      id:
        profile.id,

      name:
        profile.name,

      skins:
        Array.isArray(profile.skins)
          ? profile.skins
          : [],

      capes:
        Array.isArray(profile.capes)
          ? profile.capes
          : []

    };


    await fs.promises.writeFile(

      profilePath,

      JSON.stringify(
        safeProfile,
        null,
        2
      ),

      "utf8"

    );


    return safeProfile;

  }


  async function readProfile() {

    try {

      if (
        !fs.existsSync(profilePath)
      ) {

        return null;

      }


      const raw =
        await fs.promises.readFile(
          profilePath,
          "utf8"
        );


      return JSON.parse(
        raw
      );


    } catch (error) {

      console.error(
        "No se pudo leer el perfil de Minecraft:",
        error
      );


      return null;

    }

  }


  /* =======================================================
     OBTENER PERFIL DE MINECRAFT
  ======================================================= */

  async function fetchMinecraftProfile(
    minecraftAccessToken
  ) {

    const response =
      await fetch(
        "https://api.minecraftservices.com/minecraft/profile",
        {

          method:
            "GET",

          headers: {

            Authorization:
              `Bearer ${minecraftAccessToken}`

          }

        }
      );


    /*
     * Normalmente significa que la cuenta no tiene
     * perfil de Minecraft Java disponible.
     */

    if (
      response.status === 404
    ) {

      const error =
        new Error(
          "Esta cuenta Microsoft no tiene un perfil de Minecraft Java disponible."
        );


      error.code =
        "MINECRAFT_PROFILE_NOT_FOUND";


      throw error;

    }


    if (
      response.status === 401
    ) {

      const error =
        new Error(
          "La sesión de Minecraft no es válida."
        );


      error.code =
        "MINECRAFT_UNAUTHORIZED";


      throw error;

    }


    if (
      !response.ok
    ) {

      const body =
        await response
          .text()
          .catch(
            () => ""
          );


      console.error(
        "Minecraft profile error:",
        response.status,
        body
      );


      throw new Error(
        `Minecraft respondió con el código ${response.status}.`
      );

    }


    const profile =
      await response.json();


    if (
      !profile?.id ||
      !profile?.name
    ) {

      throw new Error(
        "Minecraft no devolvió un perfil válido."
      );

    }


    return profile;

  }


  /* =======================================================
     MICROSOFT → XBOX → MINECRAFT
  ======================================================= */

  async function exchangeMinecraftToken(
    microsoftAccessToken
  ) {

    const authenticator =
      new MicrosoftAuthenticator();


    /*
     * Paso 1:
     * Microsoft → Xbox/XSTS
     */

    const xbox =
      await authenticator.acquireXBoxToken(
        microsoftAccessToken
      );


    const xstsResponse =
      xbox?.xstsResponse;


    const xui =
      xstsResponse
        ?.DisplayClaims
        ?.xui
        ?.[0];


    if (
      !xstsResponse?.Token ||
      !xui?.uhs
    ) {

      throw new Error(
        "Xbox no devolvió una sesión válida."
      );

    }


    /*
     * Paso 2:
     * Xbox/XSTS → Minecraft
     */

    const minecraftLogin =
      await authenticator
        .loginMinecraftWithXBox(
          xui.uhs,
          xstsResponse.Token
        );


    if (
      !minecraftLogin?.access_token
    ) {

      throw new Error(
        "No se pudo obtener la sesión de Minecraft."
      );

    }


    /*
     * Paso 3:
     * obtener UUID, nombre y skin real.
     */

    const profile =
      await fetchMinecraftProfile(
        minecraftLogin.access_token
      );


    const savedProfile =
      await saveProfile(
        profile
      );


    return {

      accessToken:
        minecraftLogin.access_token,

      expiresIn:
        minecraftLogin.expires_in,

      profile:
        savedProfile

    };

  }


  /* =======================================================
     INICIAR SESIÓN
  ======================================================= */

  async function login(
    onEvent
  ) {

    try {

      const client =
        getPCA();


      onEvent?.({

        type:
          "status",

        message:
          "Conectando con Microsoft..."

      });


      const result =
        await client
          .acquireTokenByDeviceCode({

            scopes:
              MICROSOFT_SCOPES,


            deviceCodeCallback:
              response => {

                /*
                 * Microsoft actualmente entrega:
                 *
                 * verificationUri
                 * userCode
                 *
                 * NO verificationUriComplete.
                 */

                onEvent?.({

                  type:
                    "device-code",

                  userCode:
                    response.userCode,

                  verificationUri:
                    response.verificationUri,

                  expiresIn:
                    response.expiresIn,

                  message:
                    response.message

                });


                /*
                 * Abrimos la página oficial.
                 * El usuario escribe ahí el código.
                 */

                shell
                  .openExternal(
                    response.verificationUri
                  )
                  .catch(
                    error => {

                      console.error(
                        "No se pudo abrir Microsoft:",
                        error
                      );

                    }
                  );

              }

          });


      if (
        !result?.accessToken
      ) {

        throw new Error(
          "Microsoft no devolvió una sesión válida."
        );

      }


      onEvent?.({

        type:
          "status",

        message:
          "Conectando con Xbox..."

      });


      const minecraftSession =
        await exchangeMinecraftToken(
          result.accessToken
        );


      onEvent?.({

        type:
          "success",

        profile:
          minecraftSession.profile,

        message:
          `Cuenta ${minecraftSession.profile.name} conectada.`

      });


      return {

        ok:
          true,

        profile:
          minecraftSession.profile

      };


    } catch (error) {

      console.error(
        "Error de inicio de sesión:",
        error
      );


      return {

        ok:
          false,

        code:
          error?.code ||
          error?.errorCode ||
          null,

        message:
          getFriendlyErrorMessage(
            error
          )

      };

    }

  }


  /* =======================================================
     SESIÓN GUARDADA
  ======================================================= */

  async function getStatus() {

    try {

      const client =
        getPCA();


      const accounts =
        await client
          .getTokenCache()
          .getAllAccounts();


      const profile =
        await readProfile();


      return {

        configured:
          true,

        signedIn:
          accounts.length > 0 &&
          Boolean(profile),

        profile:
          accounts.length > 0
            ? profile
            : null

      };


    } catch (error) {

      if (
        error?.code ===
        "MICROSOFT_NOT_CONFIGURED"
      ) {

        return {

          configured:
            false,

          signedIn:
            false,

          profile:
            null

        };

      }


      console.error(
        "No se pudo comprobar la cuenta:",
        error
      );


      return {

        configured:
          true,

        signedIn:
          false,

        profile:
          null

      };

    }

  }


  /* =======================================================
     RENOVAR SESIÓN SIN PEDIR LOGIN
  ======================================================= */

  async function getFreshSession() {

    const client =
      getPCA();


    const accounts =
      await client
        .getTokenCache()
        .getAllAccounts();


    if (
      accounts.length === 0
    ) {

      const error =
        new Error(
          "Necesitas iniciar sesión con Microsoft."
        );


      error.code =
        "AUTH_REQUIRED";


      throw error;

    }


    let result;


    try {

      /*
       * MSAL se encarga de usar la caché
       * y renovar el token si es necesario.
       */

      result =
        await client
          .acquireTokenSilent({

            account:
              accounts[0],

            scopes:
              MICROSOFT_SCOPES

          });


    } catch (error) {

      console.error(
        "No se pudo renovar Microsoft:",
        error
      );


      const authError =
        new Error(
          "Tu sesión de Microsoft necesita volver a iniciarse."
        );


      authError.code =
        "AUTH_REQUIRED";


      throw authError;

    }


    if (
      !result?.accessToken
    ) {

      const error =
        new Error(
          "Necesitas volver a iniciar sesión con Microsoft."
        );


      error.code =
        "AUTH_REQUIRED";


      throw error;

    }


    return await exchangeMinecraftToken(
      result.accessToken
    );

  }


  /* =======================================================
     CERRAR SESIÓN
  ======================================================= */

  async function logout() {

    try {

      const client =
        getPCA();


      const tokenCache =
        client.getTokenCache();


      const accounts =
        await tokenCache
          .getAllAccounts();


      for (
        const account of accounts
      ) {

        await tokenCache.removeAccount(
          account
        );

      }


      await fs.promises.rm(
        profilePath,
        {
          force:
            true
        }
      );


      await fs.promises.rm(
        cachePath,
        {
          force:
            true
        }
      );


      /*
       * Volvemos a crear MSAL en el siguiente acceso
       * para garantizar que no quede sesión en memoria.
       */

      pca =
        null;


      return {
        ok: true
      };


    } catch (error) {

      console.error(
        "No se pudo cerrar sesión:",
        error
      );


      return {

        ok:
          false,

        message:
          "No se pudo cerrar la sesión de Microsoft."

      };

    }

  }


  /* =======================================================
     MENSAJES AMIGABLES
  ======================================================= */

  function getFriendlyErrorMessage(
    error
  ) {

    const code =
      String(
        error?.code ||
        error?.errorCode ||
        ""
      ).toLowerCase();


    const message =
      String(
        error?.message ||
        ""
      ).toLowerCase();


    if (
      code.includes("authorization_pending")
    ) {

      return "La autorización de Microsoft todavía está pendiente.";

    }


    if (
      code.includes("expired_token") ||
      message.includes("expired")
    ) {

      return "El código de Microsoft expiró. Intenta iniciar sesión nuevamente.";

    }


    if (
      code.includes("authorization_declined") ||
      message.includes("declined")
    ) {

      return "El inicio de sesión fue cancelado.";

    }


    if (
      code.includes("minecraf") &&
      code.includes("profile")
    ) {

      return "No encontramos un perfil de Minecraft Java en esta cuenta.";

    }


    if (
      message.includes("invalid app registration")
    ) {

      return "Microsoft/Xbox rechazó el registro de esta aplicación.";

    }


    if (
      message.includes("xbox")
    ) {

      return "Microsoft inició sesión, pero Xbox no pudo completar la autenticación.";

    }


    return (
      error?.message ||
      "No fue posible iniciar sesión con Microsoft."
    );

  }


  /* =======================================================
     EXPORTAR
  ======================================================= */

  return {

    login,

    logout,

    getStatus,

    getFreshSession

  };

}


module.exports = {
  createMicrosoftAuth
};