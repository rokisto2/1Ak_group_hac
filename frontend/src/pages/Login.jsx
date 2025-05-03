import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Button, FormControl, FormLabel, Input, VStack, Heading,
    FormErrorMessage, useToast, InputGroup, InputRightElement
} from "@chakra-ui/react";
import {getApiUrl} from "../utils/api.js";

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const toast = useToast();
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors = {};
        if (!email) newErrors.email = "Email is required";
        if (!password) newErrors.password = "Password is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);

            const response = await fetch(getApiUrl('/auth/login'), {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Login failed: ${response.status}`);
            }

            const data = await response.json();

            // Save authentication data
            localStorage.setItem("accessToken", data.access_token);
            localStorage.setItem("userRole", data.role);
            localStorage.setItem("userId", data.user_id);

            toast({
                title: "Login Successful",
                description: `You've been authenticated as ${data.role}`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });

            // Redirect based on role
            switch(data.role) {
                case 'user':
                    navigate('/user-dashboard');
                    break;
                case 'manager':
                    navigate('/manager-dashboard');
                    break;
                case 'superuser':
                    navigate('/admin-dashboard');
                    break;
                default:
                    navigate('/user-dashboard');
            }
        } catch (error) {
            console.error("Login error:", error);
            toast({
                title: "Login Failed",
                description: error.message || "Authentication failed. Please check your credentials.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box width="100%" maxWidth="400px" mx="auto" mt={8}>
            <VStack spacing={8} align="stretch">
                <Heading textAlign="center">Login</Heading>
                <form onSubmit={handleSubmit}>
                    <VStack spacing={4}>
                        <FormControl isInvalid={errors.email}>
                            <FormLabel>Email</FormLabel>
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <FormErrorMessage>{errors.email}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={errors.password}>
                            <FormLabel>Password</FormLabel>
                            <InputGroup>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <InputRightElement width="4.5rem">
                                    <Button
                                        h="1.75rem"
                                        size="sm"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </Button>
                                </InputRightElement>
                            </InputGroup>
                            <FormErrorMessage>{errors.password}</FormErrorMessage>
                        </FormControl>

                        <Button
                            colorScheme="blue"
                            width="100%"
                            mt={4}
                            type="submit"
                            isLoading={isLoading}
                        >
                            Log In
                        </Button>
                    </VStack>
                </form>
            </VStack>
        </Box>
    );
}

export default Login;