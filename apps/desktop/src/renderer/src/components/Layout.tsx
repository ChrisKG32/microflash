import { NavLink, Outlet } from 'react-router-dom';
import { Box, Flex, Heading, Separator, Text } from '@radix-ui/themes';
import { CardStackIcon, GearIcon } from '@radix-ui/react-icons';

import './Layout.css';

function NavButton({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <NavLink to={to} className="nav-button">
      {({ isActive }) => (
        <Flex
          align="center"
          gap="2"
          px="3"
          py="2"
          className={`nav-button-inner ${isActive ? 'active' : ''}`}
        >
          {icon}
          <Text size="2" weight="medium">
            {children}
          </Text>
        </Flex>
      )}
    </NavLink>
  );
}

export function Layout() {
  return (
    <Flex minHeight="100vh">
      {/* Sidebar */}
      <Box asChild flexShrink="0" width="200px">
        <aside>
          <Box px="4" py="3">
            <Heading size="4" weight="bold">
              MicroFlash
            </Heading>
          </Box>
          <Separator size="4" />
          <Flex asChild direction="column" gap="1" p="2">
            <nav>
              <NavButton to="/" icon={<CardStackIcon />}>
                Decks
              </NavButton>
              <NavButton to="/settings" icon={<GearIcon />}>
                Settings
              </NavButton>
            </nav>
          </Flex>
        </aside>
      </Box>

      <Separator orientation="vertical" size="4" />

      {/* Main content */}
      <Box asChild flexGrow="1" overflowY="auto">
        <main>
          <Outlet />
        </main>
      </Box>
    </Flex>
  );
}
