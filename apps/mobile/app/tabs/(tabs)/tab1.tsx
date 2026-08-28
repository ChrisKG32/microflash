import EditScreenInfo from '@/components/EditScreenInfo';
import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Example } from '@/components/ExampleSelect';
import { Button, ButtonText } from '@/components/ui/button';
import { View } from '@/components/Themed';

export default function Tab2() {
  return (
    <Center className="flex-1 gap-4">
      <Button variant="solid" size="md" action="primary">
        <ButtonText>Click Me</ButtonText>
      </Button>
      <Example />
      <Heading className="font-bold text-2xl">Expo - Tab 1</Heading>
      <Divider className="my-[30px] w-[80%]" />
      <Text className="p-4">Example below to use gluestack-ui components.</Text>
      <EditScreenInfo path="app/(app)/(tabs)/tab1.tsx" />
    </Center>
  );
}
