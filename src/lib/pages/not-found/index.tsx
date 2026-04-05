import { Box, Button, Grid, Heading, Image, Link } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";

const Page404 = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => navigate({ to: "/" });

  return (
    <Grid textAlign="center">
      <Heading alignSelf="end">Page Not Found</Heading>

      <Box>
        <Image
          src="/assets/404-not-found-rafiki.svg"
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

      <Box>
        <Button onClick={handleBackToHome}>Back to Home</Button>
      </Box>
    </Grid>
  );
};

export default Page404;
