import { chakra, type HTMLChakraProps } from "@chakra-ui/react";

function Label({ className, ...props }: HTMLChakraProps<"label">) {
  return (
    <chakra.label
      data-slot="label"
      display="inline-flex"
      alignItems="center"
      gap="2"
      fontSize="sm"
      lineHeight="1"
      fontWeight="medium"
      className={className}
      {...props}
    />
  );
}

export { Label };
