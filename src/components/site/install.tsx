import { INSTALL_GUIDES, REPO_URL } from "@/content/site";
import { InstallWindow } from "./install-window";
import { Section } from "./section";

export function Install() {
  return (
    <Section
      id="install"
      eyebrow="Install"
      title="Pick your agent, copy one line."
      description="Every command installs the latest version and comes with the one that updates it. Then just ask: the skill activates on its own, no API names needed."
    >
      <InstallWindow guides={INSTALL_GUIDES} />
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href="#prompts" className="text-brand underline underline-offset-4 hover:no-underline">
          Browse example prompts
        </a>
        <a href={`${REPO_URL}#-install`} className="text-brand underline underline-offset-4 hover:no-underline">
          View the install guide
        </a>
      </div>
    </Section>
  );
}
