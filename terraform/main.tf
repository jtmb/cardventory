terraform {
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 2.0"
    }
  }

  # Uncomment to store Terraform state in Linode Object Storage (recommended for CI/CD).
  # Create the bucket manually in the Linode console first, then add the access/secret
  # keys as environment variables AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.
  #
  # backend "s3" {
  #   bucket                      = "cardventory-tfstate"
  #   key                         = "terraform.tfstate"
  #   region                      = "us-east-1"
  #   endpoint                    = "https://us-east-1.linodeobjects.com"
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  #   skip_region_validation      = true
  #   force_path_style            = true
  # }
}

provider "linode" {
  token = var.linode_token
}

locals {
  # Extract the bare hostname from nextauth_url for the Traefik Host() routing rule.
  # e.g. "https://cards.example.com" -> "cards.example.com"
  app_hostname = trimprefix(trimprefix(var.nextauth_url, "https://"), "http://")
}

resource "linode_instance" "cardventory" {
  label           = "cardventory"
  image           = "linode/ubuntu24.04"
  region          = var.region
  type            = var.instance_type
  authorized_keys = [var.ssh_public_key]
  watchdog_enabled = true
  tags            = ["cardventory"]

  metadata {
    user_data = base64encode(templatefile("${path.module}/cloud-init.tftpl", {
      auth_secret        = var.auth_secret
      nextauth_url       = var.nextauth_url
      acme_email         = var.acme_email
      ghcr_username      = var.ghcr_username
      ghcr_token         = var.ghcr_token
      ebay_client_id     = var.ebay_client_id
      ebay_client_secret = var.ebay_client_secret
      app_hostname       = local.app_hostname
    }))
  }
}

resource "linode_firewall" "cardventory" {
  label = "cardventory-fw"

  inbound_policy  = "DROP"
  outbound_policy = "ACCEPT"

  inbound {
    label    = "ssh"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "22"
    ipv4     = ["0.0.0.0/0"]
    ipv6     = ["::/0"]
  }

  inbound {
    label    = "http"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "80"
    ipv4     = ["0.0.0.0/0"]
    ipv6     = ["::/0"]
  }

  inbound {
    label    = "https"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "443"
    ipv4     = ["0.0.0.0/0"]
    ipv6     = ["::/0"]
  }

  linodes = [linode_instance.cardventory.id]
}
