import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const REGISTRY_FILES = [
  'node_modules/uniwind/src/components/index.ts',
  'node_modules/uniwind/dist/module/components/index.js',
  'node_modules/uniwind/dist/common/components/index.js',
]

export const SAFE_AREA_FILES = [
  'node_modules/uniwind/src/components/native/SafeAreaView.tsx',
  'node_modules/uniwind/src/components/web/SafeAreaView.tsx',
  'node_modules/uniwind/dist/module/components/native/SafeAreaView.js',
  'node_modules/uniwind/dist/module/components/web/SafeAreaView.js',
  'node_modules/uniwind/dist/common/components/native/SafeAreaView.js',
  'node_modules/uniwind/dist/common/components/web/SafeAreaView.js',
]

const SRC_PROGRESS_BAR_GETTER = `    get ProgressBarAndroid() {
        return require('react-native').ProgressBarAndroid
    },`

const SRC_CLIPBOARD_GETTER = `    get Clipboard() {
        return require('react-native').Clipboard
    },`

const SRC_INTERACTION_MANAGER_GETTER = `    get InteractionManager() {
        return require('react-native').InteractionManager
    },`

const SRC_PUSH_NOTIFICATION_GETTER = `    get PushNotificationIOS() {
        return require('react-native').PushNotificationIOS
    },`

const SRC_PUSH_NOTIFICATION_PATCHED_GETTER = `    get PushNotificationIOS() {
        try {
            return require('react-native').PushNotificationIOS
        } catch {
            return undefined
        }
    },`

const DIST_PROGRESS_BAR_GETTER = `  get ProgressBarAndroid() {
    return require("react-native").ProgressBarAndroid;
  },`

const DIST_CLIPBOARD_GETTER = `  get Clipboard() {
    return require("react-native").Clipboard;
  },`

const DIST_INTERACTION_MANAGER_GETTER = `  get InteractionManager() {
    return require("react-native").InteractionManager;
  },`

const DIST_PUSH_NOTIFICATION_GETTER = `  get PushNotificationIOS() {
    return require("react-native").PushNotificationIOS;
  },`

const COMPAT_PROGRESS_BAR_GETTER = `    get ProgressBarAndroid() {
        try {
            const progressBar = require('@react-native-community/progress-bar-android')
            return progressBar?.default ?? progressBar?.ProgressBarAndroid ?? progressBar?.ProgressBar ?? progressBar
        } catch {
            return undefined
        }
    },`

const COMPAT_CLIPBOARD_GETTER = `    get Clipboard() {
        try {
            const clipboard = require('@react-native-clipboard/clipboard')
            return clipboard?.default ?? clipboard?.Clipboard ?? clipboard
        } catch {
            return undefined
        }
    },`

const COMPAT_INTERACTION_MANAGER_GETTER = `    get InteractionManager() {
        return {
            runAfterInteractions(task) {
                const callback = typeof task === 'function'
                    ? task
                    : task && typeof task.gen === 'function'
                        ? task.gen
                        : undefined
                let cancelled = false
                const handle = setTimeout(() => {
                    if (!cancelled) {
                        callback?.()
                    }
                }, 1)

                return {
                    cancel() {
                        cancelled = true
                        clearTimeout(handle)
                    },
                }
            },
            createInteractionHandle() {
                return 0
            },
            clearInteractionHandle() {},
            setDeadline() {},
        }
    },`

const COMPAT_PUSH_NOTIFICATION_GETTER = `    get PushNotificationIOS() {
        try {
            const pushNotifications = require('@react-native-community/push-notification-ios')
            return pushNotifications?.default ?? pushNotifications?.PushNotificationIOS ?? pushNotifications
        } catch {
            return undefined
        }
    },`

const DIST_COMPAT_PROGRESS_BAR_GETTER = `  get ProgressBarAndroid() {
    try {
      const progressBar = require('@react-native-community/progress-bar-android');
      return progressBar?.default ?? progressBar?.ProgressBarAndroid ?? progressBar?.ProgressBar ?? progressBar;
    } catch {
      return undefined;
    }
  },`

const DIST_COMPAT_CLIPBOARD_GETTER = `  get Clipboard() {
    try {
      const clipboard = require('@react-native-clipboard/clipboard');
      return clipboard?.default ?? clipboard?.Clipboard ?? clipboard;
    } catch {
      return undefined;
    }
  },`

const DIST_COMPAT_INTERACTION_MANAGER_GETTER = `  get InteractionManager() {
    return {
      runAfterInteractions(task) {
        const callback = typeof task === "function" ? task : task && typeof task.gen === "function" ? task.gen : undefined;
        let cancelled = false;
        const handle = setTimeout(() => {
          if (!cancelled) {
            callback?.();
          }
        }, 1);
        return {
          cancel() {
            cancelled = true;
            clearTimeout(handle);
          }
        };
      },
      createInteractionHandle() {
        return 0;
      },
      clearInteractionHandle() {},
      setDeadline() {}
    };
  },`

const DIST_COMPAT_PUSH_NOTIFICATION_GETTER = `  get PushNotificationIOS() {
    try {
      const pushNotifications = require('@react-native-community/push-notification-ios');
      return pushNotifications?.default ?? pushNotifications?.PushNotificationIOS ?? pushNotifications;
    } catch {
      return undefined;
    }
  },`

const SAFE_AREA_SOURCE_IMPORT = `import { SafeAreaView as RNSafeAreaView, ViewProps } from 'react-native'`
const SAFE_AREA_SOURCE_REPLACEMENT = `import type { ComponentProps } from 'react'
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context'`
const SAFE_AREA_SOURCE_PROPS = `(props: ViewProps)`
const SAFE_AREA_SOURCE_PROPS_REPLACEMENT = `(props: ComponentProps<typeof RNSafeAreaView>)`

const SAFE_AREA_DIST_IMPORT = `import { SafeAreaView as RNSafeAreaView } from "react-native";`
const SAFE_AREA_DIST_IMPORT_REPLACEMENT = `import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";`

const SAFE_AREA_COMMON_IMPORT = `var _reactNative = require("react-native");`
const SAFE_AREA_COMMON_IMPORT_REPLACEMENT = `var _reactNativeSafeAreaContext = require("react-native-safe-area-context");`
const SAFE_AREA_COMMON_SYMBOL = `_reactNative.SafeAreaView`
const SAFE_AREA_COMMON_SYMBOL_REPLACEMENT = `_reactNativeSafeAreaContext.SafeAreaView`

const REGISTRY_SPECS = [
  {
    path: 'node_modules/uniwind/src/components/index.ts',
    replacements: [
      {
        label: 'ProgressBarAndroid getter',
        alternatives: [SRC_PROGRESS_BAR_GETTER],
        next: COMPAT_PROGRESS_BAR_GETTER,
      },
      {
        label: 'Clipboard getter',
        alternatives: [SRC_CLIPBOARD_GETTER],
        next: COMPAT_CLIPBOARD_GETTER,
      },
      {
        label: 'InteractionManager getter',
        alternatives: [SRC_INTERACTION_MANAGER_GETTER],
        next: COMPAT_INTERACTION_MANAGER_GETTER,
      },
      {
        label: 'PushNotificationIOS getter',
        alternatives: [SRC_PUSH_NOTIFICATION_GETTER, SRC_PUSH_NOTIFICATION_PATCHED_GETTER],
        next: COMPAT_PUSH_NOTIFICATION_GETTER,
      },
    ],
  },
  {
    path: 'node_modules/uniwind/dist/module/components/index.js',
    replacements: [
      {
        label: 'ProgressBarAndroid getter',
        alternatives: [DIST_PROGRESS_BAR_GETTER],
        next: DIST_COMPAT_PROGRESS_BAR_GETTER,
      },
      {
        label: 'Clipboard getter',
        alternatives: [DIST_CLIPBOARD_GETTER],
        next: DIST_COMPAT_CLIPBOARD_GETTER,
      },
      {
        label: 'InteractionManager getter',
        alternatives: [DIST_INTERACTION_MANAGER_GETTER],
        next: DIST_COMPAT_INTERACTION_MANAGER_GETTER,
      },
      {
        label: 'PushNotificationIOS getter',
        alternatives: [DIST_PUSH_NOTIFICATION_GETTER],
        next: DIST_COMPAT_PUSH_NOTIFICATION_GETTER,
      },
    ],
  },
  {
    path: 'node_modules/uniwind/dist/common/components/index.js',
    replacements: [
      {
        label: 'ProgressBarAndroid getter',
        alternatives: [DIST_PROGRESS_BAR_GETTER],
        next: DIST_COMPAT_PROGRESS_BAR_GETTER,
      },
      {
        label: 'Clipboard getter',
        alternatives: [DIST_CLIPBOARD_GETTER],
        next: DIST_COMPAT_CLIPBOARD_GETTER,
      },
      {
        label: 'InteractionManager getter',
        alternatives: [DIST_INTERACTION_MANAGER_GETTER],
        next: DIST_COMPAT_INTERACTION_MANAGER_GETTER,
      },
      {
        label: 'PushNotificationIOS getter',
        alternatives: [DIST_PUSH_NOTIFICATION_GETTER],
        next: DIST_COMPAT_PUSH_NOTIFICATION_GETTER,
      },
    ],
  },
]

const SAFE_AREA_SPECS = [
  {
    path: 'node_modules/uniwind/src/components/native/SafeAreaView.tsx',
    replacements: [
      {
        label: 'source safe-area import',
        alternatives: [SAFE_AREA_SOURCE_IMPORT],
        next: SAFE_AREA_SOURCE_REPLACEMENT,
      },
      {
        label: 'source safe-area props',
        alternatives: [SAFE_AREA_SOURCE_PROPS],
        next: SAFE_AREA_SOURCE_PROPS_REPLACEMENT,
      },
    ],
  },
  {
    path: 'node_modules/uniwind/src/components/web/SafeAreaView.tsx',
    replacements: [
      {
        label: 'source safe-area import',
        alternatives: [SAFE_AREA_SOURCE_IMPORT],
        next: SAFE_AREA_SOURCE_REPLACEMENT,
      },
      {
        label: 'source safe-area props',
        alternatives: [SAFE_AREA_SOURCE_PROPS],
        next: SAFE_AREA_SOURCE_PROPS_REPLACEMENT,
      },
    ],
  },
  {
    path: 'node_modules/uniwind/dist/module/components/native/SafeAreaView.js',
    replacements: [
      {
        label: 'module safe-area import',
        alternatives: [SAFE_AREA_DIST_IMPORT],
        next: SAFE_AREA_DIST_IMPORT_REPLACEMENT,
      },
    ],
  },
  {
    path: 'node_modules/uniwind/dist/module/components/web/SafeAreaView.js',
    replacements: [
      {
        label: 'module safe-area import',
        alternatives: [SAFE_AREA_DIST_IMPORT],
        next: SAFE_AREA_DIST_IMPORT_REPLACEMENT,
      },
    ],
  },
  {
    path: 'node_modules/uniwind/dist/common/components/native/SafeAreaView.js',
    replacements: [
      {
        label: 'common safe-area import',
        alternatives: [SAFE_AREA_COMMON_IMPORT],
        next: SAFE_AREA_COMMON_IMPORT_REPLACEMENT,
      },
      {
        label: 'common safe-area symbol',
        alternatives: [SAFE_AREA_COMMON_SYMBOL],
        next: SAFE_AREA_COMMON_SYMBOL_REPLACEMENT,
      },
    ],
  },
  {
    path: 'node_modules/uniwind/dist/common/components/web/SafeAreaView.js',
    replacements: [
      {
        label: 'common safe-area import',
        alternatives: [SAFE_AREA_COMMON_IMPORT],
        next: SAFE_AREA_COMMON_IMPORT_REPLACEMENT,
      },
      {
        label: 'common safe-area symbol',
        alternatives: [SAFE_AREA_COMMON_SYMBOL],
        next: SAFE_AREA_COMMON_SYMBOL_REPLACEMENT,
      },
    ],
  },
]

const VERIFICATION_RULES = [
  {
    path: 'node_modules/uniwind/src/components/index.ts',
    forbidden: [
      `require('react-native').ProgressBarAndroid`,
      `require('react-native').Clipboard`,
      `require('react-native').InteractionManager`,
      `require('react-native').PushNotificationIOS`,
    ],
  },
  {
    path: 'node_modules/uniwind/dist/module/components/index.js',
    forbidden: [
      `require("react-native").ProgressBarAndroid`,
      `require("react-native").Clipboard`,
      `require("react-native").InteractionManager`,
      `require("react-native").PushNotificationIOS`,
    ],
  },
  {
    path: 'node_modules/uniwind/dist/common/components/index.js',
    forbidden: [
      `require("react-native").ProgressBarAndroid`,
      `require("react-native").Clipboard`,
      `require("react-native").InteractionManager`,
      `require("react-native").PushNotificationIOS`,
    ],
  },
  {
    path: 'node_modules/uniwind/src/components/native/SafeAreaView.tsx',
    required: [`react-native-safe-area-context`],
    forbidden: [SAFE_AREA_SOURCE_IMPORT],
  },
  {
    path: 'node_modules/uniwind/src/components/web/SafeAreaView.tsx',
    required: [`react-native-safe-area-context`],
    forbidden: [SAFE_AREA_SOURCE_IMPORT],
  },
  {
    path: 'node_modules/uniwind/dist/module/components/native/SafeAreaView.js',
    required: [`react-native-safe-area-context`],
    forbidden: [SAFE_AREA_DIST_IMPORT],
  },
  {
    path: 'node_modules/uniwind/dist/module/components/web/SafeAreaView.js',
    required: [`react-native-safe-area-context`],
    forbidden: [SAFE_AREA_DIST_IMPORT],
  },
  {
    path: 'node_modules/uniwind/dist/common/components/native/SafeAreaView.js',
    required: [`react-native-safe-area-context`],
    forbidden: [SAFE_AREA_COMMON_IMPORT, SAFE_AREA_COMMON_SYMBOL],
  },
  {
    path: 'node_modules/uniwind/dist/common/components/web/SafeAreaView.js',
    required: [`react-native-safe-area-context`],
    forbidden: [SAFE_AREA_COMMON_IMPORT, SAFE_AREA_COMMON_SYMBOL],
  },
]

/**
 * @param {string} source
 * @param {{ alternatives: string[]; next: string }} replacement
 */
function applyReplacement(source, replacement) {
  for (const candidate of replacement.alternatives) {
    if (source.includes(candidate)) {
      return {
        status: 'patched',
        source: source.split(candidate).join(replacement.next),
        matched: candidate,
      }
    }
  }

  if (source.includes(replacement.next)) {
    return {
      status: 'already-patched',
      source,
      matched: replacement.next,
    }
  }

  return {
    status: 'missing',
    source,
    matched: null,
  }
}

/**
 * @param {string} rootDir
 * @param {{ path: string; replacements: Array<{ label: string; alternatives: string[]; next: string }> }} spec
 */
function patchFile(rootDir, spec) {
  const filePath = resolve(rootDir, spec.path)

  if (!existsSync(filePath)) {
    return {
      path: spec.path,
      status: 'missing-file',
      patched: [],
      alreadyPatched: [],
      missing: [],
    }
  }

  let source = readFileSync(filePath, 'utf8')
  const patched = []
  const alreadyPatched = []
  const missing = []

  for (const replacement of spec.replacements) {
    const result = applyReplacement(source, replacement)
    source = result.source

    if (result.status === 'patched') {
      patched.push(replacement.label)
    } else if (result.status === 'already-patched') {
      alreadyPatched.push(replacement.label)
    } else {
      missing.push(replacement.label)
    }
  }

  if (missing.length > 0) {
    return {
      path: spec.path,
      status: 'drifted',
      patched,
      alreadyPatched,
      missing,
    }
  }

  if (patched.length > 0) {
    writeFileSync(filePath, source)
  }

  return {
    path: spec.path,
    status: patched.length > 0 ? 'patched' : 'already-patched',
    patched,
    alreadyPatched,
    missing,
  }
}

export function patchUniwind({ cwd = process.cwd() } = {}) {
  const results = [...REGISTRY_SPECS, ...SAFE_AREA_SPECS].map((spec) => patchFile(cwd, spec))
  const drifted = results.filter((result) => result.status === 'drifted')

  if (drifted.length > 0) {
    const details = drifted
      .map((result) => `- ${result.path}: missing markers for ${result.missing.join(', ')}`)
      .join('\n')
    throw new Error(`Uniwind patch drift detected:\n${details}`)
  }

  return {
    results,
    patchedFiles: results.filter((result) => result.status === 'patched').map((result) => result.path),
    alreadyPatchedFiles: results.filter((result) => result.status === 'already-patched').map((result) => result.path),
    missingFiles: results.filter((result) => result.status === 'missing-file').map((result) => result.path),
  }
}

export function verifyUniwindCompat({ cwd = process.cwd() } = {}) {
  const violations = []
  const checkedFiles = []

  for (const rule of VERIFICATION_RULES) {
    const filePath = resolve(cwd, rule.path)

    if (!existsSync(filePath)) {
      continue
    }

    checkedFiles.push(rule.path)
    const source = readFileSync(filePath, 'utf8')

    for (const forbidden of rule.forbidden ?? []) {
      if (source.includes(forbidden)) {
        violations.push(`${rule.path}: still contains forbidden marker ${JSON.stringify(forbidden)}`)
      }
    }

    for (const required of rule.required ?? []) {
      if (!source.includes(required)) {
        violations.push(`${rule.path}: missing required marker ${JSON.stringify(required)}`)
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Uniwind compatibility verification failed:\n${violations.map((item) => `- ${item}`).join('\n')}`)
  }

  return { checkedFiles }
}
