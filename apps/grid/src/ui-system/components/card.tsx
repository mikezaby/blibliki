import {
  Box,
  CardBody as ChakraCardBody,
  CardDescription as ChakraCardDescription,
  CardFooter as ChakraCardFooter,
  CardHeader as ChakraCardHeader,
  CardRoot as ChakraCardRoot,
  CardTitle as ChakraCardTitle,
} from "@chakra-ui/react";
import * as React from "react";

function Card({
  className,
  ...props
}: React.ComponentProps<typeof ChakraCardRoot>) {
  return <ChakraCardRoot data-slot="card" className={className} {...props} />;
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<typeof ChakraCardHeader>) {
  return (
    <ChakraCardHeader
      data-slot="card-header"
      className={className}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof ChakraCardTitle>) {
  return (
    <ChakraCardTitle data-slot="card-title" className={className} {...props} />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof ChakraCardDescription>) {
  return (
    <ChakraCardDescription
      data-slot="card-description"
      className={className}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <Box data-slot="card-action" className={className} {...props} />;
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<typeof ChakraCardBody>) {
  return (
    <ChakraCardBody data-slot="card-content" className={className} {...props} />
  );
}

function CardFooter({
  className,
  ...props
}: React.ComponentProps<typeof ChakraCardFooter>) {
  return (
    <ChakraCardFooter
      data-slot="card-footer"
      className={className}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
