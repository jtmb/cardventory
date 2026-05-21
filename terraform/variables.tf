variable "linode_token" {
  description = "Linode API personal access token (generate at https://cloud.linode.com/profile/tokens)"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "Linode region"
  type        = string
  default     = "us-east"
}

variable "instance_type" {
  description = "Linode instance type (g6-nanode-1 = 1vCPU/1GB/$5mo)"
  type        = string
  default     = "g6-nanode-1"
}

variable "ssh_public_key" {
  description = "SSH public key content for root access (paste the full contents of your ~/.ssh/id_ed25519.pub)"
  type        = string
}

variable "auth_secret" {
  description = "NextAuth.js secret — generate with: openssl rand -base64 32"
  type        = string
  sensitive   = true
}

variable "nextauth_url" {
  description = "Public URL of the app, e.g. https://cards.example.com"
  type        = string
}

variable "cloudflare_tunnel_token" {
  description = "Cloudflare Tunnel token — generate in Zero Trust dashboard under Networks > Tunnels"
  type        = string
  sensitive   = true
}

variable "ghcr_username" {
  description = "GitHub username used to pull images from ghcr.io (e.g. jtmb)"
  type        = string
}

variable "ghcr_token" {
  description = "GitHub classic PAT with read:packages scope for pulling from ghcr.io"
  type        = string
  sensitive   = true
}

variable "ebay_client_id" {
  description = "eBay API client ID (optional)"
  type        = string
  default     = ""
}

variable "ebay_client_secret" {
  description = "eBay API client secret (optional)"
  type        = string
  sensitive   = true
  default     = ""
}
