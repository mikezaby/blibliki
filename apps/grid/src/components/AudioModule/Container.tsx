import { Flex, type FlexProps } from "@chakra-ui/react";
import { ReactNode } from "react";

export default function Container({
  children,
  ...props
}: {
  children: ReactNode;
} & FlexProps) {
  return (
    <Flex justify="space-around" gap="8" {...props}>
      {children}
    </Flex>
  );
}
