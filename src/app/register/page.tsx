import { getSystemSetting } from "@/lib/system-settings";
import { RegisterClient } from "./register-client";

export default async function RegisterPage() {
  const trialEnabledStr = await getSystemSetting("TRIAL_PAID_UID_ENABLED");
  const trialEnabled = trialEnabledStr === "true";

  return <RegisterClient trialEnabled={trialEnabled} />;
}
