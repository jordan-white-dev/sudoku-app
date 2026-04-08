import { Box, chakra, Flex } from "@chakra-ui/react";
import { type PropsWithChildren } from "react";

import { Footer } from "@/lib/layout/components/footer";
import { Meta } from "@/lib/layout/components/meta";

export const Layout = ({ children }: PropsWithChildren) => (
  <Box height="100dvh" overflow="hidden">
    <Meta />
    <chakra.a
      height="1px"
      href="#main-content"
      left="-9999px"
      overflow="hidden"
      position="absolute"
      width="1px"
      _focusVisible={{
        background: "white",
        border: "2px solid",
        borderColor: "black",
        borderRadius: "md",
        color: "black",
        fontFamily: "sans-serif",
        fontWeight: "bold",
        height: "auto",
        left: "6",
        overflow: "visible",
        padding: "2",
        position: "fixed",
        top: "6",
        width: "auto",
        zIndex: 9999,
      }}
    >
      Skip to main content
    </chakra.a>
    <Flex direction="column" height="full">
      {children}

      <Footer />
    </Flex>
  </Box>
);
