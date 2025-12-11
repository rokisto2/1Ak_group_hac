import { Button, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { useTranslation } from "react-i18next";

function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        sessionStorage.setItem('language', lng);
    };

    const getCurrentLanguageLabel = () => {
        return i18n.language === 'ru' ? 'Русский' : 'English';
    };

    return (
        <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} size="sm" variant="ghost">
                {getCurrentLanguageLabel()}
            </MenuButton>
            <MenuList>
                <MenuItem onClick={() => changeLanguage('ru')}>
                    Русский
                </MenuItem>
                <MenuItem onClick={() => changeLanguage('en')}>
                    English
                </MenuItem>
            </MenuList>
        </Menu>
    );
}

export default LanguageSwitcher;

