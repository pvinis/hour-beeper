import { ConfigPlugin, withEntitlementsPlist } from "expo/config-plugins"

const withLocalNotificationsOnly: ConfigPlugin = (config) => {
	return withEntitlementsPlist(config, (cfg) => {
		delete cfg.modResults["aps-environment"]
		return cfg
	})
}

export default withLocalNotificationsOnly
