# V2A Utilities - Microsoft Entra SSO Setup

## Azure App Registration Setup

To enable Microsoft Entra SSO authentication, you need to create an App Registration in the Azure Portal:

### 1. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Fill in the registration details:
   - **Name**: `V2A Utilities`
   - **Supported account types**: `Accounts in this organizational directory only` (or as per your needs)
   - **Redirect URI**: `Single-page application (SPA)` with value `http://localhost:5173`

### 2. Configure Redirect URIs

1. After creating the app, go to **Authentication**
2. Add redirect URIs:
   - Development: `http://localhost:5173`
   - Production: `https://your-production-domain.com`

### 3. Configure API Permissions

1. Go to **API permissions**
2. Add the following Microsoft Graph permissions:
   - `User.Read` (Delegated)
   - `profile` (Delegated)
   - `email` (Delegated)
   - `openid` (Delegated)

### 4. Get Configuration Values

From the **Overview** page, copy:
- **Application (client) ID**
- **Directory (tenant) ID**

## Environment Configuration

Create a `.env` file in your project root with these values:

```env
# Replace with your actual Azure App Registration values
VITE_AZURE_CLIENT_ID=your-application-client-id-here
VITE_AZURE_TENANT_ID=your-directory-tenant-id-here
VITE_AZURE_REDIRECT_URI=http://localhost:5173
```

## Production Deployment

For production:

1. Update the redirect URI in Azure to match your production domain
2. Update the `.env` file with the production redirect URI
3. Ensure your production domain is registered in the Azure App Registration

## Security Notes

- Never commit your actual client ID and tenant ID to version control
- Use environment variables for all configuration
- Consider using Azure Key Vault for production secrets
- Regularly review and rotate application secrets

## Testing

After setup:

1. Start your development server: `npm run dev`
2. Navigate to `/consulta` - you should be redirected to Microsoft login
3. After successful login, you should be able to access the protected route

## Troubleshooting

- **CORS errors**: Ensure your redirect URI exactly matches what's configured in Azure
- **Login popup blocked**: Make sure popups are enabled for your domain
- **Token errors**: Check that the tenant ID and client ID are correct
- **Permission denied**: Verify the API permissions are granted and consented
