import { SiteHeader } from "./SiteHeader";

type PlatformHeaderProps = {
  user: {
    name: string;
    email: string;
    role: "user" | "admin";
  };
};

export function PlatformHeader({ user }: PlatformHeaderProps) {
  return <SiteHeader user={user} />;
}
