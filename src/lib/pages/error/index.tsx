import {
  Box,
  Button,
  Grid,
  Heading,
  Image,
  Link,
  Text,
} from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { type FallbackProps } from "react-error-boundary";

const ErrorPage = ({ error, resetErrorBoundary }: FallbackProps) => {
  const navigate = useNavigate();

  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred";

  const handleBackToHome = () => {
    resetErrorBoundary();
    navigate({ to: "/" });
  };

  return (
    <Grid textAlign="center">
      <Heading alignSelf="end">Something Went Wrong</Heading>

      <Box>
        <Text fontSize="sm" color="fg.muted" marginTop={2}>
          {errorMessage}
        </Text>
      </Box>

      <Box>
        <Image
          src="/assets/error-pch-vector.jpg"
          width={{ base: "320px", sm: "400px" }}
        />
        <Link
          fontSize="xs"
          href="https://www.freepik.com/images"
          target="_blank"
          rel="noopener noreferrer"
        >
          Illustration by Freepik
        </Link>
      </Box>

      <Box marginTop={4}>
        <Button onClick={handleBackToHome}>Back to Home</Button>
      </Box>
    </Grid>
  );
};

export default ErrorPage;
