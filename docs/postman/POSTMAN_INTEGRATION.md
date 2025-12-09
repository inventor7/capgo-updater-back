# Postman Integration for Capgo Updater API

This document provides instructions on how to use the Postman collection for testing the Capgo self-hosted update server API.

## Overview

The Postman collection includes all API endpoints for the Capgo updater with their required parameters and expected request/response formats. The collection is organized into logical groups:

- Health Check
- Update Endpoints
- Statistics Endpoints
- Channel Management
- Native Update Endpoints
- Admin Operations

## Prerequisites

1. Install Postman from [https://www.postman.com/](https://www.postman.com/)
2. Ensure your Capgo updater server is running
3. Have your Supabase database configured and running

## Importing the Collection

1. Open Postman
2. Click the "Import" button in the top-left corner
3. Select "Upload Files" and choose the `capgo-updater-api.postman_collection.json` file
4. The collection will be imported into your Postman workspace

## Setting Up Environment Variables

1. Click on the eye icon in the top-right corner and select "Manage Environments"
2. Click "Add" to create a new environment
3. Name it "Capgo Updater" (or any name you prefer)
4. Add the following variables with appropriate values:

### Required Variables:
- `baseUrl`: Your server URL (e.g., `http://localhost:3000` or your production URL)
- `platform`: Target platform (`android`, `ios`, or `web`)
- `version`: App version (e.g., `1.0.0`)
- `appId`: Your app identifier (e.g., `com.example.app`)
- `deviceId`: Unique device identifier
- `channel`: Channel name (e.g., `stable`, `beta`)

### Optional Variables:
- `bundleId`: Bundle identifier for stats endpoints
- `status`: Status for statistics (`downloaded`, `applied`, `failed`)
- `environment`: Environment (`dev`, `staging`, `prod`)
- `required`: Boolean for required updates (`true`/`false`)
- `downloadUrl`: URL for bundle downloads
- `checksum`: SHA-256 checksum of the bundle

## Testing the API Endpoints

### 1. Health Check Endpoints

Start by testing the health check endpoints to ensure your server is running:

- `GET /health` - Basic health check
- `GET /api/health` - API health check

### 2. Update Endpoints

#### Check for Updates
- **Method**: `POST`
- **Endpoint**: `/api/update`
- **Body**: Contains platform, version, appId, and device_id
- **Purpose**: Check if there's an update available for the app

#### Get All Updates
- **Method**: `GET`
- **Endpoint**: `/api/updates`
- **Query Parameters**: platform, appId, channel
- **Purpose**: Get all available updates for an app

#### Log Update Events
- **Endpoints**: `/api/downloaded`, `/api/applied`, `/api/failed`
- **Method**: `POST`
- **Purpose**: Log different stages of the update process

### 3. Statistics Endpoints

#### Log Update Statistics
- **Method**: `POST`
- **Endpoint**: `/api/stats`
- **Body**: Contains bundleId, status, deviceId, appId, platform
- **Purpose**: Log update statistics and analytics

### 4. Channel Management

#### Assign Channel to Device
- **Method**: `POST`
- **Endpoint**: `/api/channel_self`
- **Body**: Contains channel, deviceId, appId, platform
- **Purpose**: Assign a channel to a device

#### Get Device Channel
- **Method**: `GET`
- **Endpoint**: `/api/channel`
- **Query Parameters**: deviceId, appId, platform
- **Purpose**: Get the channel assigned to a device

#### Get Available Channels
- **Method**: `GET`
- **Endpoint**: `/api/channels`
- **Query Parameters**: appId, platform
- **Purpose**: Get all available channels for an app

### 5. Native Update Endpoints

Native updates allow for distributing native application updates (APK files for Android and IPA files for iOS) to users. These endpoints enable checking for newer native versions, uploading native files, and logging native update events.

#### Check for Native Updates
- **Method**: `GET`
- **Endpoint**: `/api/native-updates/check`
- **Query Parameters**:
  - `platform`: Target platform (`android`, `ios`)
  - `current_version_code`: Integer version code of the current app (required)
  - `channel`: Update channel (default: `stable`)
  - `environment`: Environment (default: `prod`)
- **Purpose**: Check if there's a native update (APK/IPA) available for the app based on platform and current version code

#### Log Native Update Events
- **Method**: `POST`
- **Endpoint**: `/api/native-updates/log`
- **Body**: Contains event details such as event type, platform, device_id, current_version_code, new_version, etc.
- **Purpose**: Log different stages of native update process (downloaded, applied, failed)

#### Upload Native Update File
- **Method**: `POST`
- **Endpoint**: `/api/admin/native-upload`
- **Body**: Multipart form data with native file (APK/IPA) and metadata
- **Purpose**: Upload a new native app update bundle (APK for Android or IPA for iOS)

#### Dashboard Native Update Endpoints
- **Get All Native Updates**: `GET /api/dashboard/native-updates`
- **Update Native Update**: `PUT /api/dashboard/native-updates/{id}`
- **Delete Native Update**: `DELETE /api/dashboard/native-updates/{id}`
- **Purpose**: Manage native updates through the admin dashboard

### 6. Admin Operations

#### Upload New Update Bundle
- **Method**: `POST`
- **Endpoint**: `/api/admin/upload`
- **Body**: Multipart form data with bundle file and metadata
- **Purpose**: Upload a new web app update bundle

#### Dashboard Endpoints
- **Get Dashboard Stats**: `GET /api/dashboard/stats`
- **Get All Bundles**: `GET /api/dashboard/bundles`
- **Create Bundle**: `POST /api/dashboard/bundles`
- **Update Bundle**: `PUT /api/dashboard/bundles/{id}`
- **Delete Bundle**: `DELETE /api/dashboard/bundles/{id}`
- **Get All Channels**: `GET /api/dashboard/channels`
- **Get All Devices**: `GET /api/dashboard/devices`
- **Get Statistics Data**: `GET /api/dashboard/stats-data`

## Environment Configuration Examples

### Development Environment
```
baseUrl: http://localhost:3000
platform: android
version: 1.0.0
appId: com.example.dev
channel: beta
```

### Production Environment
```
baseUrl: https://your-server.com
platform: ios
version: 2.1.0
appId: com.example.app
channel: stable
```

## Testing Workflow Example

1. **Health Check**: Verify your server is running
2. **Upload Bundle**: Use the admin upload endpoint to add a new version
3. **Check Updates**: Test the update endpoint with different parameters
4. **Log Statistics**: Test the stats endpoint to verify logging works
5. **Channel Management**: Test channel assignment and retrieval
6. **Monitor Dashboard**: Use dashboard endpoints to verify data is stored correctly

## Common Issues and Troubleshooting

### 400 Bad Request
- Check that all required parameters are provided
- Verify parameter formats (e.g., valid semver format for version)

### 500 Internal Server Error
- Check server logs for detailed error information
- Verify database connectivity
- Ensure Supabase credentials are correct

### File Upload Issues
- Ensure the file size is within the allowed limit (100MB by default)
- Verify the file format is supported (ZIP files)

### CORS Issues
- Check that CORS settings allow your Postman origin
- For local development, CORS is typically configured to allow all origins

## Security Considerations

- In production, secure your admin endpoints with authentication
- Use HTTPS for all API calls
- Rotate your Supabase keys regularly
- Monitor API usage for unusual patterns

## Additional Resources

- [Capgo Documentation](https://capgo.app/)
- [Postman Learning Center](https://learning.postman.com/)
- [API Documentation](README.md)