import { Home, Users, MessageSquare, ClipboardList, Moon, Sun } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "ダッシュボード",
    url: "/",
    icon: Home,
  },
  {
    title: "面接官管理",
    url: "/interviewers",
    icon: Users,
  },
  {
    title: "質問管理",
    url: "/questions",
    icon: MessageSquare,
  },
  {
    title: "面接セッション",
    url: "/sessions",
    icon: ClipboardList,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-6">
            AI面接システム
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    data-testid={`link-${item.url === "/" ? "dashboard" : item.url.slice(1)}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start"
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-5 w-5 mr-2" />
              ライトモード
            </>
          ) : (
            <>
              <Moon className="h-5 w-5 mr-2" />
              ダークモード
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
