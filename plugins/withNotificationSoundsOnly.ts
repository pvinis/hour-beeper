import { ConfigPlugin, IOSConfig, XcodeProject, withXcodeProject } from "expo/config-plugins"
import { copyFileSync } from "fs"
import { basename, resolve } from "path"

interface NotificationSoundsProps {
	sounds: string[]
}

const withNotificationSoundsOnly: ConfigPlugin<NotificationSoundsProps> = (config, { sounds }) => {
	return withXcodeProject(config, (cfg) => {
		setNotificationSounds(cfg.modRequest.projectRoot, {
			sounds,
			project: cfg.modResults,
			projectName: cfg.modRequest.projectName,
		})
		return cfg
	})
}

function setNotificationSounds(
	projectRoot: string,
	{ sounds, project, projectName }: { sounds: string[]; project: XcodeProject; projectName: string | undefined },
): XcodeProject {
	if (!projectName) {
		throw new Error("Unable to find iOS project name while copying notification sounds.")
	}

	const sourceRoot = IOSConfig.Paths.getSourceRoot(projectRoot)

	for (const soundFileRelativePath of sounds) {
		const fileName = basename(soundFileRelativePath)
		const sourceFilepath = resolve(projectRoot, soundFileRelativePath)
		const destinationFilepath = resolve(sourceRoot, fileName)

		copyFileSync(sourceFilepath, destinationFilepath)
		if (!project.hasFile(`${projectName}/${fileName}`)) {
			project = IOSConfig.XcodeUtils.addResourceFileToGroup({
				filepath: `${projectName}/${fileName}`,
				groupName: projectName,
				isBuildFile: true,
				project,
			})
		}
	}

	return project
}

export default withNotificationSoundsOnly
