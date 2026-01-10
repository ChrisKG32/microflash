import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Callout,
  Spinner,
  RadioGroup,
  IconButton,
} from '@radix-ui/themes';
import { ExclamationTriangleIcon, Cross2Icon } from '@radix-ui/react-icons';
import { getMe, type User } from '@microflash/api-client';

export function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMe();
      setUser(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading) {
    return (
      <Box p="6">
        <Flex align="center" justify="center" py="9">
          <Spinner size="3" />
          <Text ml="3" color="gray">
            Loading settings...
          </Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box p="6" style={{ maxWidth: '600px' }}>
      <Heading size="6" mb="5">
        Settings
      </Heading>

      {/* Error banner */}
      {error && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
          <IconButton
            size="1"
            variant="ghost"
            color="red"
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto' }}
          >
            <Cross2Icon />
          </IconButton>
        </Callout.Root>
      )}

      {/* Appearance Section */}
      <Card mb="4">
        <Heading size="3" mb="3">
          Appearance
        </Heading>
        <Text as="p" size="2" color="gray" mb="3">
          Choose how MicroFlash looks on your device.
        </Text>
        <RadioGroup.Root value={theme} onValueChange={setTheme}>
          <Flex direction="column" gap="2">
            <Text as="label" size="2">
              <Flex gap="2" align="center">
                <RadioGroup.Item value="system" />
                System
              </Flex>
            </Text>
            <Text as="label" size="2">
              <Flex gap="2" align="center">
                <RadioGroup.Item value="light" />
                Light
              </Flex>
            </Text>
            <Text as="label" size="2">
              <Flex gap="2" align="center">
                <RadioGroup.Item value="dark" />
                Dark
              </Flex>
            </Text>
          </Flex>
        </RadioGroup.Root>
      </Card>

      {/* Account Section */}
      <Card mb="4">
        <Heading size="3" mb="3">
          Account
        </Heading>
        {user ? (
          <Flex direction="column" gap="2">
            <Flex gap="2">
              <Text size="2" weight="bold">
                User ID:
              </Text>
              <Text size="2" color="gray">
                {user.id}
              </Text>
            </Flex>
            <Flex gap="2">
              <Text size="2" weight="bold">
                Clerk ID:
              </Text>
              <Text size="2" color="gray">
                {user.clerkId}
              </Text>
            </Flex>
            <Flex gap="2">
              <Text size="2" weight="bold">
                Created:
              </Text>
              <Text size="2" color="gray">
                {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </Flex>
          </Flex>
        ) : (
          <Text size="2" color="gray">
            Not signed in
          </Text>
        )}
      </Card>

      {/* About Section */}
      <Card>
        <Heading size="3" mb="3">
          About
        </Heading>
        <Flex direction="column" gap="1">
          <Text size="2" weight="bold">
            MicroFlash Desktop
          </Text>
          <Text size="2" color="gray">
            Version 0.1.0
          </Text>
          <Text size="2" color="gray" mt="2">
            A microlearning-first flashcard app for deck and card management.
          </Text>
        </Flex>
      </Card>
    </Box>
  );
}
