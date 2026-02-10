import { Input as ChakraInput, InputProps } from "@chakra-ui/react";

function Input({ className, type, ...props }: InputProps) {
  return (
    <ChakraInput
      type={type}
      data-slot="input"
      className={className}
      {...props}
    />
  );
}

export { Input };
