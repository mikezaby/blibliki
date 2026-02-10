import { Flex } from "@chakra-ui/react";
import { ReactNode } from "react";

export default function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Flex justify="space-around" gap="8" className={className}>
      {children}
    </Flex>
  );
}
