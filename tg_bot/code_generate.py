import random
import string

class CodeGenerator:
    """
    A class for generating random codes consisting of digits and English letters (both uppercase and lowercase).
    """
    def __init__(self):
        """
        Initializes the code generator with a default length for the generated codes.
        """
        self.characters = string.ascii_letters + string.digits

    def generate_code(self, length=8):
        """
        Generates a random code of the specified length.

        Args:
            length (int, optional): The length of the code to generate

        Returns:
            str: The generated random code.
        """
        return ''.join(random.choice(self.characters) for _ in range(length))